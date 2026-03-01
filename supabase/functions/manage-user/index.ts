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

    // Verify caller is super_admin or admin
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

    if (!isAdmin) throw new Error("Insufficient permissions");

    const body = await req.json();
    const { action, user_id, updates } = body;

    // Input validation
    if (!action || typeof action !== "string") throw new Error("Missing action");
    if (!user_id || typeof user_id !== "string") throw new Error("Missing user_id");

    // Verify target user exists and get their tenant
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user_id)
      .maybeSingle();

    // Non-super-admins can only manage users within their own tenant
    if (!isSuperAdmin && targetProfile) {
      const callerTenantIds = callerRoles?.map((r: any) => r.tenant_id) || [];
      if (!callerTenantIds.includes(targetProfile.tenant_id)) {
        throw new Error("Cannot manage users in a different organization");
      }
    }

    if (action === "delete") {
      if (user_id === caller.id) throw new Error("Cannot delete yourself");

      // Determine which tenant to remove the user from
      const targetTenantId = targetProfile?.tenant_id;
      if (!targetTenantId) throw new Error("User has no profile to remove");

      // Check target user role - admins can't delete super_admins
      if (!isSuperAdmin) {
        const { data: targetRoles } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id)
          .eq("tenant_id", targetTenantId);
        if (targetRoles?.some((r: any) => r.role === "super_admin")) {
          throw new Error("Cannot delete a super admin");
        }
      }

      // Remove user from THIS tenant only (roles + profile), not from auth.users globally.
      // This preserves the account if the user belongs to multiple tenants.
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("tenant_id", targetTenantId);

      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("user_id", user_id)
        .eq("tenant_id", targetTenantId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      if (user_id === caller.id) throw new Error("Cannot change your own role");
      if (!isSuperAdmin && updates.role === "super_admin") {
        throw new Error("Cannot assign super_admin role");
      }

      const { error } = await supabaseAdmin
        .from("user_roles")
        .update({ role: updates.role })
        .eq("user_id", user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_profile") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("user_id", user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban") {
      if (user_id === caller.id) throw new Error("Cannot ban yourself");
      if (!isSuperAdmin) {
        const { data: targetRoles } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id);
        if (targetRoles?.some((r: any) => r.role === "super_admin")) {
          throw new Error("Cannot ban a super admin");
        }
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h",
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unban") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
