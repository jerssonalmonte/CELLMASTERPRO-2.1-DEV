import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── AUTHORIZATION: Verify caller is admin+ ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Invalid token");

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", caller.id);

    const isSuperAdmin = callerRoles?.some((r: any) => r.role === "super_admin");
    const isAdmin = callerRoles?.some((r: any) => r.role === "admin" || r.role === "super_admin");

    if (!isAdmin) throw new Error("Insufficient permissions: admin or above required");

    // ── INPUT VALIDATION ──
    const { email, password, full_name, role, tenant_id } = await req.json();

    if (!email || typeof email !== "string" || email.length > 255) {
      throw new Error("Invalid email");
    }
    if (!password || typeof password !== "string" || password.length < 6 || password.length > 128) {
      throw new Error("Password must be between 6 and 128 characters");
    }
    if (!full_name || typeof full_name !== "string" || full_name.length > 200) {
      throw new Error("Invalid full name");
    }
    if (!tenant_id || typeof tenant_id !== "string") {
      throw new Error("Invalid tenant_id");
    }

    // Validate role value
    const validRoles = ["admin", "manager", "staff", "technician"];
    const targetRole = role || "staff";
    if (!validRoles.includes(targetRole) && targetRole !== "super_admin") {
      throw new Error("Invalid role");
    }

    // ── TENANT AUTHORIZATION ──
    // Non-super_admins can only create users within their own tenant
    if (!isSuperAdmin) {
      const callerTenant = callerRoles?.find((r: any) => r.role === "admin");
      if (!callerTenant || callerTenant.tenant_id !== tenant_id) {
        throw new Error("Cannot create users in a different organization");
      }
      // Admins cannot assign super_admin role
      if (targetRole === "super_admin") {
        throw new Error("Cannot assign super_admin role");
      }
    }

    // Try to create user first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        tenant_id,
        role: targetRole,
      },
    });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({
            error: "Este correo electrónico ya está registrado en la plataforma. Por favor, utiliza otro o contacta a soporte técnico.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      throw authError;
    }

    return new Response(JSON.stringify({ user: authData.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
