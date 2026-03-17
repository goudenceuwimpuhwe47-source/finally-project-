
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/sonner";
import { Pill, ShoppingCart } from "lucide-react";

const orderSchema = z.object({
  medication: z.string().min(1, "Please select a medication"),
  quantity: z.string().min(1, "Quantity is required"),
  dosage: z.string().min(1, "Dosage is required"),
  prescriptionNumber: z.string().min(1, "Prescription number is required"),
  deliveryAddress: z.string().min(10, "Please provide a complete delivery address"),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

const medications = [
  { id: "1", name: "Lisinopril 10mg", category: "Blood Pressure" },
  { id: "2", name: "Metformin 500mg", category: "Diabetes" },
  { id: "3", name: "Atorvastatin 20mg", category: "Cholesterol" },
  { id: "4", name: "Omeprazole 20mg", category: "Acid Reflux" },
  { id: "5", name: "Levothyroxine 50mcg", category: "Thyroid" },
  { id: "6", name: "Amlodipine 5mg", category: "Blood Pressure" },
];

const Order = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      medication: "",
      quantity: "",
      dosage: "",
      prescriptionNumber: "",
      deliveryAddress: "",
      notes: "",
    },
  });

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log("Order submitted:", data);
    
    toast("Order Submitted Successfully!", {
      description: "Your medication order has been submitted and is pending approval.",
    });
    
    form.reset();
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Order Medication</h1>
          </div>
          <p className="text-gray-400 text-sm sm:text-base">Submit a new medication order with your prescription details.</p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
              <Pill className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Medication Order Form</span>
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm sm:text-base">
              Please fill out all required fields to submit your medication order.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="medication"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white text-sm sm:text-base">Medication *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                              <SelectValue placeholder="Select medication" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {medications.map((med) => (
                              <SelectItem key={med.id} value={med.name} className="text-white hover:bg-gray-600">
                                {med.name} - {med.category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white text-sm sm:text-base">Quantity *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 30 tablets" 
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dosage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white text-sm sm:text-base">Dosage Instructions *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Take 1 tablet daily" 
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prescriptionNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white text-sm sm:text-base">Prescription Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter prescription number" 
                            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm sm:text-base">Delivery Address *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter your complete delivery address including street, city, state, and ZIP code"
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 min-h-[80px] sm:min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white text-sm sm:text-base">Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any special delivery instructions or notes for the pharmacist"
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-2 w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Order"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Order;
