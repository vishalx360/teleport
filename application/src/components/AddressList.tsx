import useBookingStore from "@/context/BookingStore";
import type { Address } from "@/generated/prisma/browser";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import {
  BriefcaseBusiness,
  Check,
  Home,
  MapPin,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

function AddressIcon({ nickname }: { nickname: string }) {
  const normalized = nickname.toLowerCase();
  if (normalized === "home") return <Home className="h-5 w-5" />;
  if (normalized === "office" || normalized === "work")
    return <BriefcaseBusiness className="h-5 w-5" />;
  return <MapPin className="h-5 w-5" />;
}

function AddressList({
  updateAddress,
  defaultAddress,
  disabledAddressId,
  disabledAddressLabel,
  setOpen,
}: {
  defaultAddress: Address | null;
  disabledAddressId?: string;
  disabledAddressLabel: string;
  updateAddress: (updatedAddress: Address) => void;
  setOpen: (open: boolean) => void;
}) {
  const { data, isLoading, error, refetch } = api.user.getAddresses.useQuery();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(
    defaultAddress,
  );
  const [search, setSearch] = useState("");
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );
  const deleteAddress = api.user.deleteAddress.useMutation();
  const utils = api.useUtils();
  const {
    pickupAddress,
    deliveryAddress,
    setPickUpAddress,
    setDeliveryAddress,
  } = useBookingStore();

  useEffect(() => setSelectedAddress(defaultAddress), [defaultAddress]);

  const filteredAddresses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data ?? [];
    return (data ?? []).filter((address) =>
      [
        address.nickname,
        address.address,
        address.contactName,
        address.mobile,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [data, search]);

  const handleConfirm = () => {
    if (!selectedAddress) return;
    updateAddress(selectedAddress);
    setOpen(false);
  };

  const handleDelete = async (addressId: string) => {
    try {
      await deleteAddress.mutateAsync(addressId);
      if (selectedAddress?.id === addressId) setSelectedAddress(null);
      if (pickupAddress?.id === addressId) setPickUpAddress(null);
      if (deliveryAddress?.id === addressId) setDeliveryAddress(null);
      setDeleteCandidateId(null);
      await utils.user.getAddresses.invalidate();
      toast.success("Saved address deleted");
    } catch {
      toast.error("This address could not be deleted");
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-center">
        <p className="text-sm font-medium text-red-100">
          Saved addresses could not be loaded.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refetch()}
          className="mt-3 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search saved addresses"
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/[.04] pl-11 pr-10 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/15"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear address search"
            className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {isLoading &&
          [...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}

        {!isLoading && filteredAddresses.length === 0 && (
          <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-white/10 px-5 text-center">
            <div>
              <MapPin className="mx-auto h-5 w-5 text-slate-500" />
              <p className="mt-2 text-sm font-medium text-slate-300">
                {data?.length ? "No matching addresses" : "No saved addresses"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {data?.length
                  ? "Try another name, street, or contact."
                  : "Add your first address using the map."}
              </p>
            </div>
          </div>
        )}

        {filteredAddresses.map((address) => {
          const selected = selectedAddress?.id === address.id;
          const disabled = disabledAddressId === address.id;
          const confirmingDelete = deleteCandidateId === address.id;

          return (
            <div
              key={address.id}
              className={cn(
                "relative overflow-hidden rounded-2xl border transition",
                selected
                  ? "border-blue-400/70 bg-blue-500/10 ring-1 ring-blue-400/30"
                  : "border-white/10 bg-white/[.035] hover:border-white/20 hover:bg-white/[.055]",
                disabled && "opacity-55",
              )}
            >
              <button
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => setSelectedAddress(address)}
                className="flex w-full items-start gap-3.5 p-4 pr-14 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                    selected
                      ? "bg-blue-500 text-white"
                      : "bg-white/[.06] text-blue-300",
                  )}
                >
                  <AddressIcon nickname={address.nickname} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-white">
                      {address.nickname || "Saved address"}
                    </span>
                    {selected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        <Check className="h-3 w-3" /> Selected
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 line-clamp-2 block text-sm leading-5 text-slate-300">
                    {address.address}
                  </span>
                  <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <UserRound className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {address.contactName} · {address.mobile}
                    </span>
                  </span>
                  {disabled && (
                    <span className="mt-2 block text-[11px] font-medium text-amber-300">
                      Already selected as {disabledAddressLabel}
                    </span>
                  )}
                </span>
              </button>

              {!disabled && !confirmingDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteCandidateId(address.id)}
                  aria-label={`Delete ${address.nickname}`}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              {confirmingDelete && (
                <div className="flex items-center justify-between gap-3 border-t border-red-400/15 bg-red-500/[.07] px-4 py-3">
                  <p className="text-xs font-medium text-red-100">
                    Delete this saved address?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteCandidateId(null)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      disabled={deleteAddress.isPending}
                      onClick={() => void handleDelete(address.id)}
                      className="rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-400 disabled:opacity-50"
                    >
                      {deleteAddress.isPending ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <Button
          type="button"
          disabled={!selectedAddress}
          onClick={handleConfirm}
          className="h-12 w-full rounded-2xl bg-blue-500 text-sm font-bold text-white hover:bg-blue-400"
        >
          {selectedAddress
            ? `Use ${selectedAddress.nickname || "this address"}`
            : "Select an address to continue"}
        </Button>
      </div>
    </div>
  );
}

export default AddressList;
