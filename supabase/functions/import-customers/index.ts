import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── AUTHORIZATION ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenant_id, customers } = await req.json();

    if (!tenant_id || !customers || !Array.isArray(customers)) {
      return new Response(JSON.stringify({ error: "tenant_id and customers array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller has manager+ role in the target tenant (or is super_admin)
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", user.id);

    const isSuperAdmin = callerRoles?.some((r: any) => r.role === "super_admin");
    const hasAccess = isSuperAdmin || callerRoles?.some(
      (r: any) => r.tenant_id === tenant_id && ["admin", "manager"].includes(r.role)
    );

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing customers for this tenant to avoid duplicates
    const { data: existing } = await supabase
      .from("customers")
      .select("full_name, phone")
      .eq("tenant_id", tenant_id);

    const existingSet = new Set(
      (existing || []).map((c: any) => `${c.full_name?.toUpperCase()}|${c.phone || ''}`)
    );

    const toInsert = customers
      .filter((c: any) => {
        const key = `${(c.full_name || '').toUpperCase()}|${c.phone || ''}`;
        return !existingSet.has(key);
      })
      .map((c: any) => ({
        tenant_id,
        full_name: c.full_name,
        phone: c.phone || null,
        address: c.address || null,
      }));

    if (toInsert.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted: 0, skipped: customers.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert in batches of 100
    let totalInserted = 0;
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const { error } = await supabase.from("customers").insert(batch);
      if (error) {
        return new Response(JSON.stringify({ error: error.message, inserted: totalInserted }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      totalInserted += batch.length;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      inserted: totalInserted, 
      skipped: customers.length - totalInserted 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
