import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Address } from "@/generated/prisma/browser";
import {
  ArrowDown,
  ArrowUp,
  MapPinned,
  Plus,
  UserCircle2Icon,
} from "lucide-react";
import { useState } from "react";
import AddressList from "./AddressList";

export type AddressType = "pickup" | "delivery";

export const AddressPicker = ({
  addressType,
  disabledAddressId,
  address,
  updateAddress,
  focused,
  onAddAddress,
}: {
  addressType: AddressType;
  address: Address | null;
  disabledAddressId?: string;
  updateAddress: (updatedAddress: Address) => void;
  focused?: boolean;
  onAddAddress?: (addressType: AddressType) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-start justify-between">
      <Dialog open={open} onOpenChange={setOpen}>
        {address ? (
          <div className="w-full rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex w-full items-start justify-between">
              <div className="flex items-start justify-between">
                <div className="text-blue-400">
                  {addressType === "pickup" && (
                    <ArrowUp className="mr-3 h-6 w-6" />
                  )}
                  {addressType === "delivery" && (
                    <ArrowDown className="mr-3 h-6 w-6" />
                  )}
                </div>
                <div className="items-center justify-between">
                  <h3 className="font-semibold text-white">
                    {addressType === "pickup" ? "Pick up from" : "Deliver to"}{" "}
                    {address.nickname}
                  </h3>
                  <p className="line-clamp-1 text-sm text-slate-400">
                    {address.address}
                  </p>
                  <div className="flex items-center gap-2 text-slate-400">
                    <UserCircle2Icon className="h-4 w-4" />
                    <p className="text-sm">
                      {address.contactName}, {address.mobile}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <DialogTrigger asChild>
                  <Button variant="link" className="text-blue-400">
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
                "w-full justify-start rounded-2xl border-white/10 bg-white/[.03] py-8 text-lg text-slate-200 hover:bg-white/[.06]",
                focused &&
                  "border-blue-500 bg-blue-500 font-bold text-white transition-colors hover:bg-blue-400 hover:text-white",
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
        <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[620px] flex-col gap-0 overflow-hidden rounded-[1.75rem] border-white/10 bg-[#111318] p-0 text-white shadow-2xl shadow-black/60 sm:max-h-[min(760px,calc(100dvh-3rem))]">
          <DialogHeader className="border-b border-white/10 px-5 py-5 pr-14 text-left sm:px-6 sm:py-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
                {addressType === "pickup" ? (
                  <ArrowUp className="h-5 w-5" />
                ) : (
                  <ArrowDown className="h-5 w-5" />
                )}
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">
                  {addressType === "pickup" ? "Pickup point" : "Destination"}
                </p>
                <DialogTitle className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                  Choose a saved address
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="mt-3 text-sm leading-5 text-slate-400">
              {addressType === "pickup"
                ? "Where should the driver collect your parcel?"
                : "Where should the driver deliver your parcel?"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
            {onAddAddress && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  onAddAddress(addressType);
                }}
                className="mb-4 h-auto w-full justify-between rounded-2xl border-blue-400/25 bg-blue-500/[.08] px-4 py-3.5 text-left text-white hover:border-blue-400/45 hover:bg-blue-500/15 hover:text-white"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 text-white">
                    <MapPinned className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">
                      Add a new address
                    </span>
                    <span className="mt-0.5 block text-xs font-normal text-slate-400">
                      Search or place a pin on the map
                    </span>
                  </span>
                </span>
                <Plus className="h-5 w-5 text-blue-300" />
              </Button>
            )}
            <AddressList
              setOpen={setOpen}
              defaultAddress={address}
              disabledAddressId={disabledAddressId}
              disabledAddressLabel={
                addressType === "pickup" ? "destination" : "pickup"
              }
              updateAddress={updateAddress}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
