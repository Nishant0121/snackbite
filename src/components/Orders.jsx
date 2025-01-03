"use client";

import { useState, useEffect } from "react";
import { getDatabase, ref, onValue, update, remove } from "firebase/database";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/firebase";
import { sendNotification } from "@/firebase.jsx";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const database = getDatabase();
    const ordersRef = ref(database, "orders");
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
        }));
        setOrders(orderList);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateOrderStatus = async (orderId, newStatus, userId) => {
    try {
      const database = getDatabase();
      const orderRef = ref(database, `orders/${orderId}`);
      await update(orderRef, { status: newStatus });

      // Send notification based on status
      let title = "Order Update";
      let body = "";

      switch (newStatus) {
        case "preparing":
          body = "Your order is now being prepared!";
          break;
        case "prepared":
          body = "Your order is ready for pickup!";
          break;
        default:
          body = `Your order status has been updated to: ${newStatus}`;
      }

      await sendNotification(userId, title, body);
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const deleteOrder = (orderId) => {
    const database = getDatabase();
    const orderRef = ref(database, `orders/${orderId}`);
    remove(orderRef);
  };

  // Table view for larger screens
  const TableView = () => (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-4 text-left">Order ID</th>
            <th className="p-4 text-left">Dish Name</th>
            <th className="p-4 text-left">Quantity</th>
            <th className="p-4 text-left">Price</th>
            <th className="p-4 text-left">Status</th>
            <th className="p-4 text-left">Customizations</th>
            <th className="p-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="p-4">#{order.userId}</td>
              <td className="p-4">{order.name}</td>
              <td className="p-4">{order.quantity}</td>
              <td className="p-4">₹{order.totalPrice}</td>
              <td className="p-4">{order.status}</td>
              <td className="p-4">
                {order.customizations ? (
                  <ul className="list-disc list-inside">
                    {order.customizations.map((custom, index) => (
                      <li key={index}>{custom}</li>
                    ))}
                  </ul>
                ) : (
                  "No customizations"
                )}
              </td>
              <td className="p-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      updateOrderStatus(order.id, "preparing", order.userId)
                    }
                    disabled={
                      order.status === "preparing" ||
                      order.status === "prepared"
                    }
                    size="sm"
                  >
                    Preparing
                  </Button>
                  <Button
                    onClick={() =>
                      updateOrderStatus(order.id, "prepared", order.userId)
                    }
                    disabled={order.status === "prepared"}
                    size="sm"
                  >
                    Prepared
                  </Button>
                  {order.status === "prepared" && (
                    <Button
                      onClick={() => deleteOrder(order.id)}
                      variant="destructive"
                      size="sm"
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Card view for mobile screens
  const CardView = () => (
    <div className="grid gap-4 md:hidden">
      {orders.map((order) => (
        <Card key={order.id} className="w-full">
          <CardHeader>
            <CardTitle>Order #{order.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              <strong>Customer ID:</strong> {order.userId}
            </p>
            <p>
              <strong>Dish:</strong> {order.name}
            </p>
            <p>
              <strong>Quantity:</strong> {order.quantity}
            </p>
            <p>
              <strong>Total Price:</strong> ₹{order.totalPrice}
            </p>
            <p>
              <strong>Status:</strong> {order.status}
            </p>
            <p>
              <strong>Order Time:</strong>{" "}
              {new Date(order.timestamp).toLocaleString()}
            </p>
            <p>
              <strong>Payment Type:</strong> {order.type}
            </p>
            {order.customizations && (
              <div>
                <strong>Customizations:</strong>
                <ul className="list-disc list-inside">
                  {order.customizations.map((custom, index) => (
                    <li key={index}>{custom}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 justify-between">
            <Button
              onClick={() =>
                updateOrderStatus(order.id, "preparing", order.userId)
              }
              disabled={
                order.status === "preparing" || order.status === "prepared"
              }
              className="w-full sm:w-auto"
            >
              Preparing
            </Button>
            <Button
              onClick={() =>
                updateOrderStatus(order.id, "prepared", order.userId)
              }
              disabled={order.status === "prepared"}
              className="w-full sm:w-auto"
            >
              Prepared
            </Button>
            {order.status === "prepared" && (
              <Button
                onClick={() => deleteOrder(order.id)}
                variant="destructive"
                className="w-full sm:w-auto"
              >
                Complete Order
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Orders</h1>
      <TableView />
      <CardView />
    </div>
  );
}
