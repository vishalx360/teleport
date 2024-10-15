import { zodResolver } from '@hookform/resolvers/zod';
import { LocateFixed } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Location } from './MapPicker';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { locationSchema } from './validationSchema';

const LocationForm = ({
    handleCurrentLocation,
    mapLocation,
    onSubmit,
    isPending
}:
    {
        handleCurrentLocation: () => void;
        mapLocation: Location;
        onSubmit: () => void;
        isPending: boolean;
    }
) => {
    const { control, handleSubmit, setValue, formState: { errors }, clearErrors } = useForm({
        resolver: zodResolver(locationSchema),
        defaultValues: {
            nickname: '',
            contactName: '',
            mobile: '',
            address: mapLocation.address,
            latitude: mapLocation.latitude,
            longitude: mapLocation.longitude,
        }
    });

    // Update the address field when mapAddress changes
    useEffect(() => {
        setValue('address', mapLocation.address);
        setValue('latitude', (mapLocation.latitude));
        setValue('longitude', (mapLocation.longitude));
        clearErrors()
    }, [mapLocation]);

    return (
        <div className="p-2">
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className='flex flex-col gap-4 justify-stretch items-stretch'>
                    <Button
                        type="button"
                        onClick={handleCurrentLocation}
                        variant="outline"
                    >
                        <LocateFixed className='mr-2 w-5 h-5' />  Current location
                    </Button>
                    <div className="mb-2">
                        <Label className="block text-sm font-medium">Address:</Label>
                        <Controller
                            name="address"
                            control={control}
                            render={({ field }) => (
                                <Textarea
                                    {...field}
                                    className={`border border-gray-300 rounded w-full px-2 py-1 ${errors.address ? 'border-red-500' : ''}`}
                                />

                            )}
                        />
                        {errors.address && <span className="text-red-500 text-sm">{String(errors.address.message)}</span>}
                    </div>
                </div>
                <div className="mb-2">
                    <Label className="block text-sm font-medium">Nickname:</Label>
                    <Controller
                        name="nickname"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                {...field}
                                className="border border-gray-300 rounded w-full px-2 py-1"
                            />
                        )}
                    />
                </div>
                <div className='flex gap-4 justify-center items-center'>

                    <div className="mb-2">
                        <Label className="block text-sm font-medium">Contact Name:</Label>
                        <Controller
                            name="contactName"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    {...field}
                                    required
                                    className={`border border-gray-300 rounded w-full px-2 py-1 ${errors.contactName ? 'border-red-500' : ''}`}
                                />
                            )}
                        />
                        {errors.contactName && <span className="text-red-500 text-sm">{errors.contactName.message}</span>}
                    </div>
                    <div className="mb-2">
                        <Label className="block text-sm font-medium">Mobile Number:</Label>
                        <Controller
                            name="mobile"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="tel"
                                    {...field}
                                    required
                                    className={`border border-gray-300 rounded w-full px-2 py-1 ${errors.mobile ? 'border-red-500' : ''}`}
                                />
                            )}
                        />
                        {errors.mobile && <span className="text-red-500 text-sm">{errors.mobile.message}</span>}
                    </div>
                </div>
                {
                    errors.latitude || errors.longitude ? (
                        <div className="text-red-500 text-xs">Please click on the map to select a location.</div>
                    ) : null
                }
                <Button
                    loading={isPending}
                    type="submit"
                    disabled={Object.keys(errors).length > 0}
                    className="mt-4 w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 hover:text-white text-white rounded">
                    Save Address
                </Button>
            </form>
        </div>
    );
};

export default LocationForm;
