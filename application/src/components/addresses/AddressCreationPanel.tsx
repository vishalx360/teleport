"use client";

import type { Address } from "@/generated/prisma/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addressSchema } from "@/components/validationSchema";
import { api } from "@/trpc/react";
import { Check, Crosshair, Loader2, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { MapViewportBounds } from "@/components/maps/MapboxMap";
import AddressLocationSearch from "./AddressLocationSearch";

export type SelectedAddressLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

type AddressCreationPanelProps = {
  selection: SelectedAddressLocation | null;
  isResolving?: boolean;
  onCancel: () => void;
  onSaved: (address: Address) => void;
  onSelectLocation: (location: SelectedAddressLocation) => void;
  searchProximity?: { latitude: number; longitude: number } | null;
  searchBounds?: MapViewportBounds | null;
  title?: string;
};

export default function AddressCreationPanel({
  selection,
  isResolving = false,
  onCancel,
  onSaved,
  onSelectLocation,
  searchProximity,
  searchBounds,
  title = "Add a saved address",
}: AddressCreationPanelProps) {
  const utils = api.useUtils();
  const saveAddress = api.user.saveAddress.useMutation();
  const [nickname, setNickname] = useState("");
  const [contactName, setContactName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setAddress(selection?.address ?? "");
    setErrors((current) => ({ ...current, address: "", location: "" }));
  }, [selection]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selection) {
      setErrors({ location: "Choose a point on the map first." });
      return;
    }

    const result = addressSchema.safeParse({
      nickname,
      contactName,
      mobile,
      address,
      latitude: selection.latitude,
      longitude: selection.longitude,
    });
    if (!result.success) {
      setErrors(
        result.error.issues.reduce<Record<string, string>>((next, issue) => {
          next[String(issue.path[0])] = issue.message;
          return next;
        }, {}),
      );
      return;
    }

    try {
      const saved = await saveAddress.mutateAsync(result.data);
      await utils.user.getAddresses.invalidate();
      toast.success(saved.message);
      onSaved(saved.address);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Address could not be saved",
      );
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.6rem] border border-blue-400/30 bg-[#15171c]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="flex items-start justify-between border-b border-white/10 p-5 sm:p-6">
        <div>
          <p className="eyebrow">Map selection</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Click the exact point on the map, then confirm its details.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label="Cancel adding address"
          className="shrink-0 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          <AddressLocationSearch
            onSelect={onSelectLocation}
            proximity={searchProximity}
            bounds={searchBounds}
          />

          <div
            className={`rounded-2xl border p-4 ${
              selection
                ? "border-blue-400/40 bg-blue-500/10"
                : "border-dashed border-white/15 bg-white/[.03]"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500 text-white">
                {isResolving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selection ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {isResolving
                    ? "Finding this address…"
                    : selection
                      ? "Location selected"
                      : "Select a location"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {selection
                    ? `${selection.latitude.toFixed(5)}, ${selection.longitude.toFixed(5)}`
                    : "Search above, tap anywhere on the map, or use the current-location control."}
                </p>
              </div>
            </div>
          </div>
          {errors.location && (
            <p className="text-xs text-rose-400">{errors.location}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="address">Street address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Select a map point to find the address"
              className="min-h-20 rounded-xl border-white/10 bg-white/[.03] text-white"
            />
            {errors.address && (
              <p className="text-xs text-rose-400">{errors.address}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">Label</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Home, Office, Warehouse…"
              className="h-11 rounded-xl border-white/10 bg-white/[.03] text-white"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Contact name</Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Who should we contact?"
                className="h-11 rounded-xl border-white/10 bg-white/[.03] text-white"
              />
              {errors.contactName && (
                <p className="text-xs text-rose-400">{errors.contactName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                type="tel"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                placeholder="10–15 digits"
                className="h-11 rounded-xl border-white/10 bg-white/[.03] text-white"
              />
              {errors.mobile && (
                <p className="text-xs text-rose-400">{errors.mobile}</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#111318]/95 p-4 sm:p-5">
          <Button
            type="submit"
            disabled={
              !selection ||
              isResolving ||
              saveAddress.isPending ||
              !nickname.trim() ||
              !contactName.trim() ||
              mobile.trim().length < 10 ||
              address.trim().length < 5
            }
            className="h-12 w-full rounded-2xl bg-blue-500 text-base font-bold text-white hover:bg-blue-400"
          >
            {saveAddress.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="mr-2 h-4 w-4" />
            )}
            Save address
          </Button>
        </div>
      </form>
    </section>
  );
}
