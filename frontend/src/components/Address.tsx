import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ArrowDown, ArrowUp, UserCircle2Icon } from "lucide-react"
import { useState } from "react"

export type AddressType = "pickup" | "delivery"

export interface Address {
    location: string
    address: string
    name: string
    contact: string
}

interface AddressProps {
    addressType: AddressType
    address: Address | null
    onEdit: (updatedAddress: Address) => void
    focused?: boolean
}

export const Address: React.FC<AddressProps> = ({ addressType, address, onEdit, focused }) => {
    const [editingAddress, setEditingAddress] = useState<Address | null>(null)

    const handleEditClick = () => setEditingAddress(address || {})

    const handleSaveAddress = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const updatedAddress: Address = {
            location: formData.get("location") as string,
            address: formData.get("address") as string,
            name: formData.get("name") as string,
            contact: formData.get("contact") as string
        }
        onEdit(updatedAddress)
        setEditingAddress(null)
    }

    const renderFormField = (id: string, label: string, defaultValue: string) => (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} name={id} defaultValue={defaultValue} required />
        </div>
    )

    return (
        <div className="flex items-start justify-between">
            <Dialog>
                {address ? (
                    <div className="w-full">
                        <div className="flex items-start w-full justify-between">
                            <div className="flex items-start justify-between">
                                <div>
                                    {addressType === "pickup" && <ArrowUp className="mr-2 h-6 w-6" />}
                                    {addressType === "delivery" && <ArrowDown className="mr-2 h-6 w-6" />}
                                </div>
                                <div className=" items-center justify-between">
                                    <h3 className="font-semibold">
                                        {addressType === "pickup" ? "Pick up from" : "Deliver to"} {address.location}
                                    </h3>
                                    <p className="text-sm line-clamp-1 text-gray-600">{address.address}</p>
                                    <div className="flex items-center gap-2">
                                        <UserCircle2Icon className="w-4 h-4" />
                                        <p className="text-sm text-gray-600">{address.name}, {address.contact}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <DialogTrigger asChild>
                                    <Button variant="link" className="text-blue-500" onClick={handleEditClick}>
                                        Change
                                    </Button>
                                </DialogTrigger>
                            </div>
                        </div>

                    </div>
                ) :
                    <DialogTrigger asChild>
                        <Button
                            onClick={handleEditClick}
                            variant={focused ? "default" : "outline"}
                            className={cn(
                                "w-full rounded-xl py-8 text-lg justify-start",
                                focused && "bg-blue-500  transition-colors hover:bg-blue-600 text-white font-bold"
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
                }
                {editingAddress && (
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Edit {addressType === "pickup" ? "Pickup" : "Delivery"} Address</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveAddress} className="space-y-4">
                            {renderFormField("location", "Location Nick Name", editingAddress.location)}
                            {renderFormField("address", "Address", editingAddress.address)}
                            {renderFormField("name", "Name", editingAddress.name)}
                            {renderFormField("contact", "Contact", editingAddress.contact)}
                            <Button type="submit" className="w-full">Save Changes</Button>
                        </form>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    )
}
