/**
 * Reusable templates and message generators for guest communications.
 */

export const generatePendingWhatsApp = (reservation, restaurant) => {
  const restName = restaurant?.name || "the restaurant";
  return `Hello ${reservation.name},

We have received your reservation request at ${restName}.

Reservation Details
Date: ${reservation.date}
Time: ${reservation.time}
Guests: ${reservation.guests}

Our team is currently reviewing your reservation.
We will confirm it shortly.

Thank you for choosing ${restName}.`;
};

export const generateConfirmedWhatsApp = (reservation, restaurant) => {
  const restName = restaurant?.name || "the restaurant";
  return `Hello ${reservation.name},

Your reservation at ${restName} has been confirmed.

Reservation Details
Date: ${reservation.date}
Time: ${reservation.time}
Guests: ${reservation.guests}

We look forward to serving you.

Thank you.`;
};

export const generateCancelledWhatsApp = (reservation, restaurant) => {
  const restName = restaurant?.name || "the restaurant";
  return `Hello ${reservation.name},

Unfortunately, your reservation at ${restName} has been cancelled.

Reservation Details
Date: ${reservation.date}
Time: ${reservation.time}
Guests: ${reservation.guests}

We sincerely apologize for the inconvenience.
Please contact us if you would like to book another table.

Thank you.`;
};
