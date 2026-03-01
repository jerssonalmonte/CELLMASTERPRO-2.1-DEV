-- Set CellMaster-Pro as lifetime subscription (owner tenant)
UPDATE tenants 
SET subscription_status = 'activa', 
    subscription_plan = 'lifetime', 
    next_due_date = '2099-12-31', 
    monthly_fee = 0 
WHERE id = 'f89c6ae4-4c8c-4960-8fb6-daddf71bcd29';
