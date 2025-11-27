// src/components/CreateOrderModal.jsx

import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { cn } from "@/lib/utils";

// shadcn/ui components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Icons
import {
  Loader2,
  Package,
  User,
  Mail,
  CalendarIcon,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

// Toast system (ví dụ: react-hot-toast)
import { toast } from "react-hot-toast";

// 1. Schema validation
const orderFormSchema = z.object({
  orderName: z
    .string()
    .min(3, { message: "Tên đơn hàng phải có ít nhất 3 ký tự." }),
  customerName: z
    .string()
    .min(2, { message: "Tên khách hàng không được bỏ trống." }),
  customerEmail: z.string().email({ message: "Email không hợp lệ." }),
  orderType: z.enum(["standard", "express", "pickup"], {
    required_error: "Bạn phải chọn loại đơn hàng.",
  }),
  dueDate: z.date({ required_error: "Ngày giao hàng không được bỏ trống." }),
});


// 2. Reusable TextField
const TextField = ({
  label,
  icon: Icon,
  placeholder,
  field,
  disabled,
  type = "text",
}) => (
  <FormItem>
    <FormLabel>{label}</FormLabel>
    <FormControl>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          {...field}
          placeholder={placeholder}
          disabled={disabled}
          type={type}
          className={Icon ? "pl-9" : ""}
        />
      </div>
    </FormControl>
    <FormMessage>
      {field?.error && (
        <div className="flex items-center text-destructive text-sm">
          <AlertCircle className="mr-1 h-3 w-3" />
          {field.error.message}
        </div>
      )}
    </FormMessage>
  </FormItem>
);

export default function CreateOrderModal({ isOpen, onClose }) {
  const [isLoading, setIsLoading] = useState(false);

  const form =
    useForm <
    OrderFormValues >
    {
      resolver: zodResolver(orderFormSchema),
      defaultValues: {
        orderName: "",
        customerName: "",
        customerEmail: "",
        orderType: "standard",
        dueDate: undefined,
      },
    };

  const firstInputRef = useRef < HTMLInputElement > null;

  // Focus vào input đầu tiên khi mở modal
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 200);
    }
  }, [isOpen]);

    setIsLoading(true);
    try {
      // Ví dụ gọi API

      toast.custom((t) => (
        <div
          className={cn(
            "bg-green-500 text-white px-4 py-2 rounded-md",
            t.visible ? "animate-enter" : "animate-leave"
          )}
        >
          <CheckCircle className="inline mr-2 h-4 w-4" />
          Order created successfully!
        </div>
      ));

      form.reset();
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.custom((t) => (
        <div
          className={cn(
            "bg-red-500 text-white px-4 py-2 rounded-md",
            t.visible ? "animate-enter" : "animate-leave"
          )}
        >
          <XCircle className="inline mr-2 h-4 w-4" />
          Failed to create order. Please try again.
        </div>
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    form.reset();
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Package className="mr-2 h-6 w-6" /> Create New Order
          </DialogTitle>
          <DialogDescription>
            Enter the details below to create a new order.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 pt-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="orderName"
                render={({ field }) => (
                  <TextField
                    label="Order Name"
                    placeholder="e.g. Order #1234"
                    field={{ ...field, ref: firstInputRef }}
                    disabled={isLoading}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="orderType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select order type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="express">Express</SelectItem>
                          <SelectItem value="pickup">Pickup</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <TextField
                    label="Customer Name"
                    icon={User}
                    placeholder="John Doe"
                    field={field}
                    disabled={isLoading}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <TextField
                    label="Customer Email"
                    icon={Mail}
                    placeholder="john.doe@example.com"
                    field={field}
                    disabled={isLoading}
                    type="email"
                  />
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-6 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Creating...
                  </>
                ) : (
                  "Create Order"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );