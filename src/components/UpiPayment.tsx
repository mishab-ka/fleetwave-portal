import React from "react";
import QRCode from "qrcode.react";
import { Button } from "@/components/ui/button";

const UpiPayment = () => {
  const upiId = "8590253089@ikwik";
  const upiUrl = `upi://pay?pa=${upiId}&pn=Fleetwave&cu=INR`;

  return (
    <div className="flex flex-col items-center space-y-4">
      <h2 className="text-lg font-bold">Pay Rent via UPI</h2>
      <QRCode value={upiUrl} size={200} />
      <p className="text-sm text-gray-500">
        Scan the QR code above to pay via UPI.
      </p>
      <Button
        onClick={() => {
          window.open(upiUrl, "_blank");
        }}
        className="bg-blue-500 text-white hover:bg-blue-600"
      >
        Open UPI App
      </Button>
    </div>
  );
};

export default UpiPayment;
