import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import useBookingStore from "@/context/BookingStore";
import { api } from '@/trpc/react';
import { Address } from "@prisma/client";
import { LucideTrash } from "lucide-react";
import { useState } from 'react';
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

function AddressList({ updateAddress, defaultAddress, disabledAddressId, setOpen }: { defaultAddress: Address | null; disabledAddressId?: string, updateAddress: (updatedAddress: Address) => void; setOpen: (open: boolean) => void; }) {
    const { data, isLoading, error } = api.user.getAddresses.useQuery();
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(defaultAddress);

    if (error) return <p>Error loading addresses</p>;

    const handleConfirm = () => {
        if (!selectedAddress) {
            console.error('No address selected');
            return;
        }
        updateAddress(selectedAddress);
        setOpen(false);
    };

    return (
        <div>
            {isLoading ? (
                <div className="space-y-5">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            ) : (
                <>
                    {data?.length ? (
                        <RadioGroup className="space-y-5">
                            {data.map((address) => (
                                <div key={address.id} className="flex items-start gap-5">
                                    <RadioGroupItem
                                        value={address.id}
                                        id={address.id}
                                        disabled={disabledAddressId === address.id}
                                        checked={selectedAddress?.id === address.id}
                                        onChange={() => {
                                            if (disabledAddressId !== address.id) setSelectedAddress(address);
                                        }}
                                        className="form-radio hidden"
                                    />
                                    <Label
                                        htmlFor={address.id}
                                        className={`w-full space-y-2 p-4 border rounded-lg cursor-pointer ${disabledAddressId === address.id ? 'opacity-50 cursor-not-allowed' : ''} ${selectedAddress?.id === address.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                                        onClick={() => {
                                            if (disabledAddressId !== address.id) setSelectedAddress(address);
                                        }}
                                    >
                                        <h2 className='font-bold'>{address.nickname || "Unnamed Address"}</h2>
                                        <p className='line-clamp-1 text-gray-600'>{address.address}</p>
                                        <p className='text-gray-600'>{`${address.contactName}, ${address.mobile}`}</p>
                                    </Label>
                                    <DeleteAddress addressId={address.id} />
                                </div>

                            ))}
                        </RadioGroup>
                    ) : (
                        <div className="text-center text-gray-600 py-5">
                            No addresses found. Add a new address to continue.
                        </div>
                    )}
                </>
            )}
            <Button
                disabled={!selectedAddress}
                onClick={handleConfirm}
                className="mt-5 w-full"
            >
                Confirm Address
            </Button>
        </div>
    );
}

function DeleteAddress({ addressId }: { addressId: string }) {
    const { mutateAsync, isPending } = api.user.deleteAddress.useMutation();
    const utils = api.useUtils();
    const { pickupAddress, deliveryAddress, setPickUpAddress, setDeliveryAddress } = useBookingStore();

    const handleDelete = async () => {
        try {
            await mutateAsync(addressId);
            utils.user.getAddresses.refetch();
            if (pickupAddress?.id === addressId) {
                setPickUpAddress(null);
            }
            if (deliveryAddress?.id === addressId) {
                setDeliveryAddress(null);
            }
        } catch (error) {
            console.error('Error deleting address:', error);
        }
    };

    return (
        <div className="ml-auto">
            <Button
                loading={isPending}
                type="button" onClick={handleDelete} variant="outline" className="text-red-500">
                <LucideTrash className="h-4 w-4 mr-1 text-red-500" />
            </Button>
        </div>
    );
}

export default AddressList;
