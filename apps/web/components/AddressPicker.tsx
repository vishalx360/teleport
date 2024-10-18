import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Address } from "@repo/database";
import { ArrowDown, ArrowUp, UserCircle2Icon } from "lucide-react";
import { useState } from "react";
import { AddAddress } from "./AddAddress";
import AddressList from "./AddressList";

export type AddressType = "pickup" | "delivery";

export const AddressPicker = ({ addressType, disabledAddressId, address, updateAddress, focused }: {
    addressType: AddressType;
    address: Address | null;
    disabledAddressId?: string;
    updateAddress: (updatedAddress: Address) => void;
    focused?: boolean;
}) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex items-start justify-between">
            <Dialog open={open} onOpenChange={setOpen}>
                {address ? (
                    <div className="w-full">
                        <div className="flex items-start w-full justify-between">
                            <div className="flex items-start justify-between">
                                <div>
                                    {addressType === "pickup" && <ArrowUp className="mr-2 h-6 w-6" />}
                                    {addressType === "delivery" && <ArrowDown className="mr-2 h-6 w-6" />}
                                </div>
                                <div className="items-center justify-between">
                                    <h3 className="font-semibold">
                                        {addressType === "pickup" ? "Pick up from" : "Deliver to"} {address.nickname}
                                    </h3>
                                    <p className="text-sm line-clamp-1 text-gray-600">{address.address}</p>
                                    <div className="flex items-center gap-2">
                                        <UserCircle2Icon className="w-4 h-4" />
                                        <p className="text-sm text-gray-600">
                                            {address.contactName}, {address.mobile}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <DialogTrigger asChild>
                                    <Button variant="link" className="text-blue-500">
                                        Change
                                    </Button>
                                </DialogTrigger>
                            </div>
                        </div>
                    </div>
                ) : (
                    <DialogTrigger asChild>
                        <Button
                            variant={focused ? "default" : "outline"}
                            className={cn(
                                "w-full rounded-xl py-8 text-lg justify-start",
                                focused && "bg-blue-500 transition-colors hover:bg-blue-600 text-white font-bold"
                            )}
                        >
                            {addressType === "pickup" ? (
                                <>
                                    <ArrowUp className="mr-2 h-6 w-6" />
                                    Set pick up location
                                </>
                            ) : (
                                <>
                                    <ArrowDown className="mr-2 h-6 w-6" />
                                    Set drop location
                                </>
                            )}
                        </Button>
                    </DialogTrigger>
                )}
                <DialogContent aria-describedby="">
                    <DialogHeader>
                        <DialogTitle>Select {addressType === "pickup" ? "Pickup" : "Delivery"} Address</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        Please select address from the following list or add a new address
                    </DialogDescription>
                    <AddAddress />
                    <AddressList
                        setOpen={setOpen}
                        defaultAddress={address}
                        disabledAddressId={disabledAddressId}
                        updateAddress={updateAddress} />
                </DialogContent>
            </Dialog>
        </div>
    );
};

