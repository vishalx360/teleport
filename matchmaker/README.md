# Matchmaking Service

This service will listen to a kafka topic called BOOKINGS
once a message is recevied, it will start the matchmaking process

## Matchmaking Process

1. Get the booking details from the message
   1. bookingId
   2. pickup latitude and longitude
   3. dropoff latitude and longitude
   4. vehicle type
2. Get all the nearest drivers from the redis location with the vehicle type
3. Get the nearest available driver from the list of drivers
   1. Send a notification to the driver (push notification : websocket)
   2. Mark driver busy with this bookingId in the redis (Lock) for 10 seconds
   3. if the driver accepts the booking
      1. remove the driver from the available list of drivers
      2. send the booking details to the driver and user.
      3. update the booking status as accepted
      4. assign the driver to the booking
   4. if the driver rejects the booking
      1. mark the driver available again
      2. mark driver unavailable for this bookingId
      3. get the next nearest driver, repeat the process
4. if no driver is available
   1. send a message to the user that no driver is available.
   2. mark the booking as failed.
