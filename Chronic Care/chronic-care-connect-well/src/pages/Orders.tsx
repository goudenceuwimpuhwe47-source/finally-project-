import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Package, CheckCircle, XCircle, Search, Filter } from "lucide-react";

type OrderStatus = "pending" | "approved" | "processing" | "shipped" | "delivered" | "cancelled";

interface Order {
  id: string;
  medication: string;
  quantity: string;
  status: OrderStatus;
  orderDate: string;
  deliveryDate?: string;
  prescriptionNumber: string;
  total: number;
}

const mockOrders: Order[] = [
  {
    id: "ORD-001",
    medication: "Lisinopril 10mg",
    quantity: "30 tablets",
    status: "delivered",
    orderDate: "2024-05-15",
    deliveryDate: "2024-05-18",
    prescriptionNumber: "RX123456",
    total: 25.99,
  },
  {
    id: "ORD-002",
    medication: "Metformin 500mg",
    quantity: "60 tablets",
    status: "shipped",
    orderDate: "2024-05-20",
    prescriptionNumber: "RX123457",
    total: 45.50,
  },
  {
    id: "ORD-003",
    medication: "Atorvastatin 20mg",
    quantity: "30 tablets",
    status: "processing",
    orderDate: "2024-05-22",
    prescriptionNumber: "RX123458",
    total: 32.75,
  },
  {
    id: "ORD-004",
    medication: "Omeprazole 20mg",
    quantity: "30 capsules",
    status: "approved",
    orderDate: "2024-05-25",
    prescriptionNumber: "RX123459",
    total: 28.99,
  },
  {
    id: "ORD-005",
    medication: "Levothyroxine 50mcg",
    quantity: "90 tablets",
    status: "pending",
    orderDate: "2024-05-28",
    prescriptionNumber: "RX123460",
    total: 15.25,
  },
];

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return "bg-yellow-600 hover:bg-yellow-700";
    case "approved":
      return "bg-blue-600 hover:bg-blue-700";
    case "processing":
      return "bg-purple-600 hover:bg-purple-700";
    case "shipped":
      return "bg-orange-600 hover:bg-orange-700";
    case "delivered":
      return "bg-green-600 hover:bg-green-700";
    case "cancelled":
      return "bg-red-600 hover:bg-red-700";
    default:
      return "bg-gray-600 hover:bg-gray-700";
  }
};

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "approved":
    case "processing":
      return <Package className="h-4 w-4" />;
    case "shipped":
    case "delivered":
      return <CheckCircle className="h-4 w-4" />;
    case "cancelled":
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const Orders = () => {
  const [orders] = useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.medication.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === "pending").length,
      approved: orders.filter(o => o.status === "approved").length,
      delivered: orders.filter(o => o.status === "delivered").length,
    };
    return stats;
  };

  const stats = getOrderStats();

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">My Orders</h1>
          </div>
          <p className="text-gray-400 text-sm sm:text-base">Track and manage your medication orders.</p>
        </div>

        {/* Order Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Total Orders</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-500">{stats.pending}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Approved</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-500">{stats.approved}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs sm:text-sm">Delivered</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-500">{stats.delivered}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Filter Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by medication or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>
              <div className="w-full lg:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="all" className="text-white hover:bg-gray-600">All Status</SelectItem>
                    <SelectItem value="pending" className="text-white hover:bg-gray-600">Pending</SelectItem>
                    <SelectItem value="approved" className="text-white hover:bg-gray-600">Approved</SelectItem>
                    <SelectItem value="processing" className="text-white hover:bg-gray-600">Processing</SelectItem>
                    <SelectItem value="shipped" className="text-white hover:bg-gray-600">Shipped</SelectItem>
                    <SelectItem value="delivered" className="text-white hover:bg-gray-600">Delivered</SelectItem>
                    <SelectItem value="cancelled" className="text-white hover:bg-gray-600">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-white text-lg sm:text-xl">Order History</CardTitle>
            <CardDescription className="text-gray-400 text-sm sm:text-base">
              View all your medication orders and their current status.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Mobile Cards View */}
            <div className="block sm:hidden">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border-b border-gray-700 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium text-sm">{order.id}</p>
                      <p className="text-gray-300 text-sm">{order.medication}</p>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} text-white text-xs`}>
                      <span className="flex items-center space-x-1">
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status}</span>
                      </span>
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Quantity: {order.quantity}</p>
                    <p>Date: {new Date(order.orderDate).toLocaleDateString()}</p>
                    <p>Total: ${order.total.toFixed(2)}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white mt-2 w-full text-xs"
                  >
                    View Details
                  </Button>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-gray-700/50">
                    <TableHead className="text-gray-300">Order ID</TableHead>
                    <TableHead className="text-gray-300">Medication</TableHead>
                    <TableHead className="text-gray-300">Quantity</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Order Date</TableHead>
                    <TableHead className="text-gray-300">Total</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="border-gray-700 hover:bg-gray-700/50">
                      <TableCell className="text-white font-medium">{order.id}</TableCell>
                      <TableCell className="text-white">{order.medication}</TableCell>
                      <TableCell className="text-gray-300">{order.quantity}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(order.status)} text-white`}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(order.status)}
                            <span className="capitalize">{order.status}</span>
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        ${order.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 px-4">
                <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No orders found</p>
                <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Orders;
