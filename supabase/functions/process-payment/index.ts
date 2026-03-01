import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── AUTH ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error("Invalid token");

    // Verify caller is manager+
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role, tenant_id")
      .eq("user_id", user.id);

    const isSuperAdmin = callerRoles?.some((r: any) => r.role === "super_admin");

    const { action, ar_id, loan_id, installment_id, amount, payment_method, notes } = await req.json();

    // ── AR PAYMENT ──
    if (action === "ar_payment") {
      if (!ar_id || typeof ar_id !== "string") throw new Error("Invalid ar_id");

      // Fetch the AR record
      const { data: ar, error: arErr } = await supabaseAdmin
        .from("accounts_receivable")
        .select("*")
        .eq("id", ar_id)
        .single();
      if (arErr || !ar) throw new Error("Account receivable not found");

      // Check caller has access to this tenant
      const hasAccess = isSuperAdmin || callerRoles?.some(
        (r: any) => ["admin", "manager"].includes(r.role) && r.tenant_id === ar.tenant_id
      );
      if (!hasAccess) throw new Error("Insufficient permissions");

      // Validate amount
      const payAmount = parseFloat(amount);
      if (isNaN(payAmount) || payAmount <= 0) throw new Error("Invalid payment amount");
      if (payAmount > Number(ar.balance_due)) throw new Error("Payment exceeds balance due");

      if (ar.status === "pagado") throw new Error("Account already fully paid");

      // Validate payment method
      const validMethods = ["efectivo", "transferencia", "tarjeta"];
      if (!validMethods.includes(payment_method || "efectivo")) {
        throw new Error("Invalid payment method");
      }

      // Insert payment
      const { error: payErr } = await supabaseAdmin.from("ar_payments").insert({
        ar_id,
        amount: payAmount,
        payment_method: payment_method || "efectivo",
        notes: notes ? String(notes).slice(0, 500) : null,
      });
      if (payErr) throw payErr;

      // Update AR balances (server-side calculation)
      const newPaid = Number(ar.paid_amount) + payAmount;
      const newBalance = Number(ar.original_amount) - newPaid;
      const newStatus = newBalance <= 0 ? "pagado" : "parcial";

      const { error: updateErr } = await supabaseAdmin
        .from("accounts_receivable")
        .update({
          paid_amount: newPaid,
          balance_due: Math.max(0, newBalance),
          status: newStatus,
        })
        .eq("id", ar_id);
      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({
        success: true,
        paid_amount: newPaid,
        balance_due: Math.max(0, newBalance),
        status: newStatus,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PAY LOAN INSTALLMENT ──
    if (action === "pay_installment") {
      if (!loan_id || !installment_id) throw new Error("Missing loan_id or installment_id");

      // Fetch loan
      const { data: loan, error: loanErr } = await supabaseAdmin
        .from("loans")
        .select("*")
        .eq("id", loan_id)
        .single();
      if (loanErr || !loan) throw new Error("Loan not found");

      // Check access
      const hasAccess = isSuperAdmin || callerRoles?.some(
        (r: any) => ["admin", "manager"].includes(r.role) && r.tenant_id === loan.tenant_id
      );
      if (!hasAccess) throw new Error("Insufficient permissions");

      if (loan.status === "liquidado" || loan.status === "cancelado") {
        throw new Error("Loan is already closed");
      }

      // Fetch installment
      const { data: inst, error: instErr } = await supabaseAdmin
        .from("loan_installments")
        .select("*")
        .eq("id", installment_id)
        .eq("loan_id", loan_id)
        .single();
      if (instErr || !inst) throw new Error("Installment not found");
      if (inst.is_paid) throw new Error("Installment already paid");

      // Mark installment as paid
      await supabaseAdmin.from("loan_installments").update({
        is_paid: true,
        paid_amount: inst.scheduled_payment,
        paid_at: new Date().toISOString(),
      }).eq("id", installment_id);

      // Recalculate loan totals from DB (server-side truth)
      const { data: allInst } = await supabaseAdmin
        .from("loan_installments")
        .select("*")
        .eq("loan_id", loan_id);

      if (allInst) {
        const totalPaid = allInst
          .filter((i: any) => i.is_paid || i.id === installment_id)
          .reduce((s: number, i: any) => s + Number(i.id === installment_id ? inst.scheduled_payment : i.paid_amount), 0);
        const totalPrincipal = allInst
          .filter((i: any) => i.is_paid || i.id === installment_id)
          .reduce((s: number, i: any) => s + Number(i.principal_amount), 0);
        const allPaid = allInst.every((i: any) => i.is_paid || i.id === installment_id);

        await supabaseAdmin.from("loans").update({
          paid_amount: Number(loan.down_payment) + totalPaid,
          balance_due: Number(loan.financed_amount) - totalPrincipal,
          status: allPaid ? "liquidado" : "al_dia",
          ...(allPaid ? { liquidated_at: new Date().toISOString() } : {}),
        }).eq("id", loan_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LIQUIDATE LOAN ──
    if (action === "liquidate_loan") {
      if (!loan_id) throw new Error("Missing loan_id");

      const { data: loan, error: loanErr } = await supabaseAdmin
        .from("loans")
        .select("*")
        .eq("id", loan_id)
        .single();
      if (loanErr || !loan) throw new Error("Loan not found");

      const hasAccess = isSuperAdmin || callerRoles?.some(
        (r: any) => ["admin", "manager"].includes(r.role) && r.tenant_id === loan.tenant_id
      );
      if (!hasAccess) throw new Error("Insufficient permissions");

      if (loan.status === "liquidado" || loan.status === "cancelado") {
        throw new Error("Loan is already closed");
      }

      // Pay all unpaid installments (capital only)
      const { data: unpaidInst } = await supabaseAdmin
        .from("loan_installments")
        .select("*")
        .eq("loan_id", loan_id)
        .eq("is_paid", false);

      if (unpaidInst && unpaidInst.length > 0) {
        const unpaidIds = unpaidInst.map((i: any) => i.id);
        await supabaseAdmin.from("loan_installments").update({
          is_paid: true,
          paid_amount: 0, // will be overridden below per-row
          is_early_payment: true,
          paid_at: new Date().toISOString(),
        }).in("id", unpaidIds);

        // Set individual principal_amount as paid_amount (capital-only liquidation)
        for (const inst of unpaidInst) {
          await supabaseAdmin.from("loan_installments").update({
            paid_amount: inst.principal_amount,
          }).eq("id", inst.id);
        }
      }

      await supabaseAdmin.from("loans").update({
        paid_amount: loan.total_amount,
        balance_due: 0,
        status: "liquidado",
        liquidated_at: new Date().toISOString(),
      }).eq("id", loan_id);

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
