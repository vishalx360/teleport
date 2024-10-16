import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import { LucidePlusCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import MapPicker from "./MapPicker";

export const AddAddress = () => {
    const utils = api.useUtils();
    const { mutateAsync, isPending } = api.user.saveAddress.useMutation();
    const [open, setOpen] = useState(false);

    async function onSubmit(data: any) {
        try {
            // Call the tRPC mutation to save the address
            await mutateAsync(data).then(async (res) => {
                toast.success(res.message);
                await utils.user.getAddresses.refetch();
                setOpen(false);
            }).catch((error) => {
                console.error('Error saving address:', error);
                toast.error('Failed to save address.');
            })
        } catch (error) {
            console.error('Error saving address:', error);
            alert('Failed to save address.');
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                >
                    <LucidePlusCircle className="w-4 h-4 mr-2" />  Add New Address
                </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="" className="md:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Add Address</DialogTitle>
                    <DialogDescription>
                        Add a new address for delivery or pickup.
                    </DialogDescription>
                </DialogHeader>
                <div className="w-full h-full">
                    <MapPicker isPending={isPending} onSubmit={onSubmit} />
                </div>
            </DialogContent>
        </Dialog>
    );
};