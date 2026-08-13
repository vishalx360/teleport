"use client";

import AppPageHeader from "@/components/AppPageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useBookingStore from "@/context/BookingStore";
import { vehicles } from "@/lib/constants";
import { api } from "@/trpc/react";
import { ArrowRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";

// Default values for props
const defaultCheckoutData = {
  totalAmount: 54,
  savings: 6,
  addresses: {
    pickup: {
      type: "pickup",
      location: "Flat",
      address: "ABC Building, 3rd Floor",
      name: "Vishal Kumar",
      contact: "+91123456789",
    },
    delivery: {
      type: "delivery",
      location: "Work",
      address: "1st Floor XYZ Building",
      name: "John Doe",
      contact: "+91123456788",
    },
  },
  distance: 2,
  estimatedDeliveryTime: "20-25 mins",
  pickupTime: "9 mins",
  deliveryFee: 60,
  discountPercentage: 10,
  discountAmount: 6,
  vehicle: vehicles[0],
};

type CheckoutProps = typeof defaultCheckoutData;

export default function CheckoutPage() {
  const estimatedDeliveryTime = defaultCheckoutData.estimatedDeliveryTime;
  const pickupTime = defaultCheckoutData.pickupTime;

  const {
    distance,
    pickupAddress,
    deliveryAddress,
    selectedVehicle,
    discountPercentage,
  } = useBookingStore();

  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (
      hydrated &&
      (pickupAddress === null ||
        deliveryAddress === null ||
        selectedVehicle === null)
    )
      router.replace("/new-booking");
  }, [hydrated, pickupAddress, deliveryAddress, selectedVehicle, router]);

  if (
    !hydrated ||
    pickupAddress === null ||
    deliveryAddress === null ||
    selectedVehicle === null
  ) {
    return null;
  }
  const price = selectedVehicle.perKmCost * distance;
  const discount = price * (discountPercentage / 100);
  const finalPrice = price - discount;

  const formattedPrice = `₹${price.toFixed(2)}`;
  const formattedDiscount = `₹${discount.toFixed(2)}`;
  const formattedFinalPrice = `₹${finalPrice.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-[#101114] pb-24">
      <AppPageHeader
        title="Review delivery"
        description="Confirm the route and estimated fare."
        fallbackHref="/new-booking"
      />
      <Card className="mx-auto w-[calc(100%-2rem)] max-w-6xl rounded-[2rem] border-white/10 bg-[#17191e] shadow-2xl shadow-black/20 sm:w-[calc(100%-3rem)]">
        <CardContent className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_0.85fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-5">
              <h2 className="text-xl font-semibold text-white">To pay</h2>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-3xl font-bold text-blue-300">
                  {formattedFinalPrice}
                </span>
                <span className="font-medium text-blue-300">
                  You save {formattedDiscount}
                </span>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <h3 className="font-semibold text-white">Delivery details</h3>
              <div className="flex items-center gap-3">
                <span>{pickupAddress?.nickname}</span>
                <ArrowRight className="h-5 w-5" />
                <span>{deliveryAddress?.nickname}</span>
              </div>
              <p className="text-sm text-slate-400">
                {distance} km • Est. delivery in {estimatedDeliveryTime}
              </p>
            </div>
            <Card className="border-white/10 bg-white/[.03] p-2 px-4 shadow-none">
              <div className="flex items-center justify-between gap-5">
                <div className="flex items-center gap-5">
                  <img
                    src={selectedVehicle.icon}
                    alt={selectedVehicle.name}
                    className="h-10 w-10"
                  />
                  <div className="items-center">
                    <span className="mr-2 text-sm font-bold text-slate-200">
                      {selectedVehicle?.name}
                    </span>
                    <div className="flex items-center text-blue-300">
                      <Clock className="mr-2 h-4 w-4" />
                      <span className="text-sm font-medium">
                        Est. Pick up in {pickupTime}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="justify-self-end">
                  <p className="text-lg font-bold text-blue-300">
                    {formattedPrice}
                  </p>
                </div>
              </div>
            </Card>
          </div>
          <div className="space-y-4 rounded-2xl bg-white/[.04] p-5">
            <h3 className="font-semibold text-white">Bill details</h3>
            <div className="rounded-xl bg-black/20 p-4">
              <div className="space-y-1 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Delivery Fee for {distance} kms</span>
                  <span>{formattedPrice}</span>
                </div>
                <div className="flex justify-between text-blue-300">
                  <span>{discountPercentage}% Discount</span>
                  <span>-{formattedDiscount}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
                  <span>To Pay</span>
                  <span>{formattedFinalPrice}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm leading-6 text-slate-400">
                By continuing to payment you confirm that your order does not
                contain any illegal or contraband items.{" "}
                <a href="#" className="text-blue-300">
                  View terms
                </a>
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#17191e]/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:px-7 sm:pb-7">
          <MakePaymentButton
            finalPrice={finalPrice}
            formattedFinalPrice={formattedFinalPrice}
          />
        </CardFooter>
      </Card>
    </div>
  );
}

function MakePaymentButton({
  finalPrice,
  formattedFinalPrice,
}: {
  finalPrice: number;
  formattedFinalPrice: string;
}) {
  const {
    pickupAddress,
    deliveryAddress,
    distance,
    duration,
    selectedVehicle,
  } = useBookingStore();
  const router = useRouter();
  const { isPending, mutate } = api.user.makeBooking.useMutation({
    onSuccess(result) {
      window.location.assign(result.checkoutUrl);
    },
    onError(error, variables, context) {
      toast.error(error.message);
    },
  });
  function handleMakePayment() {
    if (!pickupAddress?.id || !deliveryAddress?.id || !selectedVehicle?.class)
      return;
    mutate({
      deliveryAddressId: deliveryAddress.id,
      pickupAddressId: pickupAddress.id,
      vehicleClass: selectedVehicle.class,
    });
  }

  return (
    <Button
      loading={isPending}
      onClick={handleMakePayment}
      className="h-12 w-full rounded-2xl bg-blue-500 py-6 text-lg font-bold text-white hover:bg-blue-400"
    >
      Continue to secure payment | {formattedFinalPrice}
    </Button>
  );
}
