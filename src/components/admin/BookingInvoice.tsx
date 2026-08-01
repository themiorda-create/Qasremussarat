import { forwardRef } from "react";
import { format } from "date-fns";

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  event_date: string;
  package_type: string;
  guests: number;
  total_price: number;
  status: string;
  created_at: string;
  message?: string;
  menu_items?: any;
  venues?: { name: string };
  event_time?: string;
}

interface BookingInvoiceProps {
  booking: Booking;
  payments: Payment[];
}

const BookingInvoice = forwardRef<HTMLDivElement, BookingInvoiceProps>(
  ({ booking, payments }, ref) => {
    const totalCredits = payments
      .filter((p) => p.payment_type === "credit")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalDebits = payments
      .filter((p) => p.payment_type === "debit")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = totalCredits - totalDebits;
    const remaining = (booking.total_price || 0) - balance;

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 max-w-2xl mx-auto"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">Qasr-e-Mussarat Marquee</h1>
          <p className="text-sm text-gray-600">Premium Event Venue</p>
          <p className="text-xs text-gray-500 mt-2">
            Invoice #{booking.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Booking Details */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-bold text-sm mb-2 uppercase text-gray-600">
              Customer Details
            </h3>
            <p className="font-semibold">{booking.name}</p>
            <p className="text-sm">{booking.phone}</p>
            <p className="text-sm">{booking.email}</p>
          </div>
          <div className="text-right">
            <h3 className="font-bold text-sm mb-2 uppercase text-gray-600">
              Event Details
            </h3>
            <p className="font-semibold">
              {format(new Date(booking.event_date), "MMMM dd, yyyy")}
            </p>
            <p className="text-sm">{booking.venues?.name || "Venue TBD"}</p>
            <p className="text-sm">{booking.guests} Guests</p>
            <p className="text-sm capitalize">{booking.package_type} Package</p>
            <p className="text-sm capitalize">{booking.event_time || "Day"} Event</p>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="border-t border-b border-gray-300 py-4 mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-sm">Description</th>
                <th className="text-right py-2 text-sm">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2">
                  {booking.package_type} Package - {booking.guests} Guests
                </td>
                <td className="text-right py-2">
                  Rs. {booking.total_price?.toLocaleString()}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 font-bold">
                <td className="py-2">Total</td>
                <td className="text-right py-2">
                  Rs. {booking.total_price?.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-sm mb-3 uppercase text-gray-600">
              Payment History
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Notes</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100">
                    <td className="py-2">
                      {format(new Date(payment.created_at), "MMM dd, yyyy")}
                    </td>
                    <td className="py-2 capitalize">{payment.payment_method}</td>
                    <td className="py-2">{payment.notes || "-"}</td>
                    <td
                      className={`text-right py-2 ${
                        payment.payment_type === "credit"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {payment.payment_type === "credit" ? "+" : "-"}Rs.{" "}
                      {Number(payment.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Balance Summary */}
        <div className="bg-gray-100 p-4 rounded mb-6">
          <div className="flex justify-between mb-2">
            <span>Total Amount:</span>
            <span>Rs. {booking.total_price?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between mb-2 text-green-600">
            <span>Amount Paid:</span>
            <span>Rs. {balance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
            <span>Balance Due:</span>
            <span className={remaining > 0 ? "text-red-600" : "text-green-600"}>
              Rs. {remaining.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <span
            className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${
              booking.status === "confirmed"
                ? "bg-green-100 text-green-800"
                : booking.status === "completed"
                ? "bg-blue-100 text-blue-800"
                : booking.status === "cancelled"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            Status: {booking.status?.toUpperCase()}
          </span>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
          <p>Thank you for choosing Qasr-e-Mussarat Marquee</p>
          <p>Generated on {format(new Date(), "MMMM dd, yyyy 'at' hh:mm a")}</p>
        </div>
      </div>
    );
  }
);

BookingInvoice.displayName = "BookingInvoice";

export default BookingInvoice;
