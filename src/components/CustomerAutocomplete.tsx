import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { User, Phone, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types';

interface Props {
  customers: Customer[];
  customerName: string;
  customerPhone: string;
  customerCedula?: string;
  onSelectCustomer: (customer: Customer) => void;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onCedulaChange?: (cedula: string) => void;
  showCedula?: boolean;
  nameLabel?: string;
  namePlaceholder?: string;
}

export function CustomerAutocomplete({
  customers,
  customerName,
  customerPhone,
  customerCedula = '',
  onSelectCustomer,
  onNameChange,
  onPhoneChange,
  onCedulaChange,
  showCedula = true,
  nameLabel = 'Nombre',
  namePlaceholder = 'Nombre del cliente',
}: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!customerName || customerName.length < 2) return [];
    const q = customerName.toLowerCase();
    return customers
      .filter((c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.cedula?.includes(q)
      )
      .slice(0, 8);
  }, [customerName, customers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    onSelectCustomer(customer);
    setShowSuggestions(false);
  };

  const handleNameChange = (value: string) => {
    setSelectedCustomerId(null);
    onNameChange(value);
    setShowSuggestions(true);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className={showCedula ? 'col-span-2' : 'col-span-2'} ref={containerRef}>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {nameLabel} {selectedCustomerId && <span className="text-xs text-primary ml-1">✓ registrado</span>}
        </label>
        <div className="relative">
          <Input
            value={customerName}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => { if (customerName.length >= 2) setShowSuggestions(true); }}
            placeholder={namePlaceholder}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
              {suggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent',
                    selectedCustomerId === c.id && 'bg-accent'
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{c.full_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {c.phone && (
                        <span className="flex items-center gap-0.5">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                      )}
                      {c.cedula && (
                        <span className="flex items-center gap-0.5">
                          <CreditCard className="h-3 w-3" /> {c.cedula}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium leading-none">Teléfono</label>
        <Input
          value={customerPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="809-000-0000"
        />
      </div>
      {showCedula ? (
        <div>
          <label className="text-sm font-medium leading-none">Cédula</label>
          <Input
            value={customerCedula}
            onChange={(e) => onCedulaChange?.(e.target.value)}
            placeholder="000-0000000-0"
          />
        </div>
      ) : (
        <div /> 
      )}
    </div>
  );
}
