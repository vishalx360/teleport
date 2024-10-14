import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from '@/trpc/react';
import { Address } from "@prisma/client";
import { LucideTrash } from "lucide-react";
import { useState } from 'react';
import { Button } from "./ui/button";

function AddressList({ updateAddress, setOpen }: { updateAddress: (updatedAddress: Address) => void; setOpen: (open: boolean) => void; }) {
    const { data, isLoading, error } = api.user.getAddresses.useQuery();
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

    if (isLoading) return <p>Loading...</p>;
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
            {data?.length === 0 ? (
                <p>No addresses found. Add a new address to continue.</p>
            ) : (
                <RadioGroup className="space-y-5">
                    {data?.map((address) => (
                        <div key={address.id} className="flex items-start gap-5">
                            <RadioGroupItem
                                value={address.id}
                                id={address.id}
                                checked={selectedAddress?.id === address.id}
                                onChange={() => setSelectedAddress(address)}
                                className="form-radio hidden"
                            />
                            <Label
                                className={`w-full space-y-2 p-4 border rounded-lg cursor-pointer ${selectedAddress?.id === address.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                                htmlFor={address.id}
                                onClick={() => setSelectedAddress(address)}
                            >
                                <h2 className='font-bold'>{address.nickname || "Unnamed Address"}</h2>
                                <p className='line-clamp-1 text-gray-600'>{address.address}</p>
                                <p className='text-gray-600'>{`${address.contactName}, ${address.mobile}`}</p>
                            </Label>
                            <div className="space-y-2">
                                {/*TODO: <EditAddress addressId={address.id} /> */}
                                <DeleteAddress addressId={address.id} />
                            </div>
                        </div>
                    ))}
                </RadioGroup>
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
    const { mutateAsync } = api.user.deleteAddress.useMutation();
    const handleDelete = async () => {
        try {
            await mutateAsync(addressId);
            console.log('Address deleted:', addressId);
            // Optionally, trigger a refetch or state update here
        } catch (error) {
            console.error('Error deleting address:', error);
        }
    };

    return (
        <div className="ml-auto">
            <Button type="button" onClick={handleDelete} variant="outline" className="text-red-500">
                <LucideTrash className="h-4 w-4 mr-1 text-red-500" />
            </Button>
        </div>
    );
}

export default AddressList;
