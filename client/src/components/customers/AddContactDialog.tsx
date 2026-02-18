import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { contactsApi } from "@/api/v2/contacts";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  role: z.string().optional(),
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email("Valid email required"),
  source: z.string().min(1, "Select a source"),
  status: z.string().min(1, "Select a status"),
  is_manual: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  tag: string;
}

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSuccess?: () => void;
}

export function AddContactDialog({ open, onOpenChange, contact, onSuccess }: AddContactDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "manual", status: "fresh", is_manual: true },
  });

  const currentSource = watch("source");
  const currentStatus = watch("status");

  // Populate form when editing existing contact
  useEffect(() => {
    if (contact) {
      setValue("name", contact.name);
      setValue("phone", contact.phone);
      setValue("email", contact.email);
      setValue("source", contact.source);
      setValue("status", contact.tag);
      setValue("is_manual", true); // Editing always marks as manual
    } else {
      reset({ source: "manual", status: "fresh", is_manual: true });
    }
  }, [contact, setValue, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (contact) {
        // Update existing contact - always mark as manual when editing
        await contactsApi.updateContact(contact.id, {
          name: values.name,
          phone: values.phone,
          email: values.email,
          tag: values.status,
          is_manual_status: true,
        });
        toast.success("Contact updated successfully");
      } else {
        // Create new contact
        await contactsApi.createContact({
          name: values.name,
          phone: values.phone,
          email: values.email,
          tag: values.status,
          source: values.source,
          is_manual_status: values.is_manual,
        });
        toast.success("Contact added successfully");
      }
      onSuccess?.();
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(contact ? "Failed to update contact" : "Failed to add contact");
      console.error(error);
    }
  };

  const isEditMode = !!contact;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="flex items-center gap-3 bg-[#F15E04] text-white px-4 py-3">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
            {isEditMode ? "✎" : "+"}
          </div>
          <DialogHeader>
            <DialogTitle className="text-white">
              {isEditMode ? "Edit Contact" : "Add New Contact"}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="p-5 space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input {...register("name")} />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Input {...register("role")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input {...register("phone")} placeholder="+1 (555) 000-0000" />
                {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input {...register("email")} type="email" placeholder="email@example.com" />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Source</Label>
                <Select
                  value={currentSource}
                  onValueChange={(v: string) => setValue("source", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pms">PMS</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="webchat">Webchat</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                {errors.source && <p className="text-xs text-red-600">{errors.source.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={currentStatus}
                  onValueChange={(v: string) => setValue("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresh">Fresh</SelectItem>
                    <SelectItem value="purchased">Purchased</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="fresh_na">Fresh - NA</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-red-600">{errors.status.message}</p>}
              </div>
            </div>

            {/* Manual Status Warning */}
            {!isEditMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700">
                  Manual contacts won't be auto-updated by Bolna sync. Status will remain as set unless manually changed.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className={cn("bg-[#F15E04] hover:bg-[#d94f04]")} disabled={isSubmitting}>
                {isSubmitting
                  ? (isEditMode ? "Saving..." : "Adding...")
                  : (isEditMode ? "Save Changes" : "Add Contact")
                }
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

