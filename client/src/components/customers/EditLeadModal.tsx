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
import { crmApi, CustomerStatus, CrmCustomer } from "@/api/crm";
import { Edit2 } from "lucide-react";
import { useEffect } from "react";

const schema = z.object({
    name: z.string().min(2, "Name is required"),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Use international format: +91XXXXXXXXXX"),
    email: z.string().email("Valid email required").or(z.literal("")),
    status: z.enum(["fresh", "interested", "not_interested", "booked", "NA", "queries"]),
});

type FormValues = z.infer<typeof schema>;

interface EditLeadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: CrmCustomer | null;
    onSuccess?: () => void;
}

export function EditLeadModal({ open, onOpenChange, customer, onSuccess }: EditLeadModalProps) {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    const currentStatus = watch("status");

    useEffect(() => {
        if (customer) {
            reset({
                name: customer.name,
                phoneNumber: customer.phoneNumber,
                email: customer.email || "",
                status: customer.status,
            });
        }
    }, [customer, reset]);

    const onSubmit = async (values: FormValues) => {
        if (!customer) return;
        try {
            await crmApi.update(customer._id, values);
            toast.success("Lead updated successfully");
            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update lead");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 overflow-hidden">
                <div className="flex items-center gap-3 bg-[#F15E04] text-white px-4 py-3">
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                        <Edit2 className="h-5 w-5" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Lead</DialogTitle>
                    </DialogHeader>
                </div>
                <div className="p-5 space-y-4">
                    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-1">
                            <Label className="text-xs">Full Name</Label>
                            <Input {...register("name")} placeholder="John Doe" />
                            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Phone (International)</Label>
                                <Input {...register("phoneNumber")} placeholder="+91XXXXXXXXXX" />
                                {errors.phoneNumber && <p className="text-xs text-red-600">{errors.phoneNumber.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Email (Optional)</Label>
                                <Input {...register("email")} type="email" placeholder="john@example.com" />
                                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Status</Label>
                            <Select
                                value={currentStatus}
                                onValueChange={(v: CustomerStatus) => setValue("status", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fresh">Fresh</SelectItem>
                                    <SelectItem value="interested">Interested</SelectItem>
                                    <SelectItem value="not_interested">Not Interested</SelectItem>
                                    <SelectItem value="booked">Booked</SelectItem>
                                    <SelectItem value="NA">NA</SelectItem>
                                    <SelectItem value="queries">Queries</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.status && <p className="text-xs text-red-600">{errors.status.message}</p>}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className={cn("bg-[#F15E04] hover:bg-[#d94f04]")} disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
