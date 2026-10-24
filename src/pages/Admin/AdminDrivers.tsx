import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  X, 
  RefreshCw, 
  MapPin, 
  Package, 
  Bike, 
  Car, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  MessageCircle,
  Eye,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  AdminDriver, 
  AdminOrder, 
  getAdminDrivers, 
  saveAdminDrivers, 
  addAdminDriver, 
  updateAdminDriver, 
  deleteAdminDriver,
  getAdminOrders,
  saveAdminOrders
} from './adminData';
import { 
  fetchDrivers, 
  createBackendDriver, 
  updateBackendDriver, 
  deleteBackendDriver,
  fetchOrders,
  assignDriverToBackendOrder
} from '../../services/api';
import { Link } from 'react-router-dom';

export function AdminDrivers() {
  const [drivers, setDrivers] = useState<AdminDriver[]>(() => getAdminDrivers());
  const [orders, setOrders] = useState<AdminOrder[]>(() => getAdminOrders());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Available' | 'On Delivery' | 'Off Duty' | 'Inactive'>('All');
  const [vehicleFilter, setVehicleFilter] = useState<'All' | 'Motorcycle' | 'Scooter' | 'Car' | 'Van' | 'Bicycle'>('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDriver, setSelectedDriver] = useState<AdminDriver | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formVehicleType, setFormVehicleType] = useState<AdminDriver['vehicleType']>('Motorcycle');
  const [formVehicleNumber, setFormVehicleNumber] = useState('');
  const [formLicenseNumber, setFormLicenseNumber] = useState('');
  const [formStatus, setFormStatus] = useState<AdminDriver['status']>('Available');
  const [formCurrentZone, setFormCurrentZone] = useState('Kakkanad & Infopark');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Deliveries viewer modal
  const [deliveriesModalDriver, setDeliveriesModalDriver] = useState<AdminDriver | null>(null);

  // Delete confirm modal
  const [deleteConfirmDriver, setDeleteConfirmDriver] = useState<AdminDriver | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch drivers from backend or fallback to local
      const res = await fetchDrivers();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setDrivers(res.data);
        saveAdminDrivers(res.data);
      } else {
        setDrivers(getAdminDrivers());
      }
    } catch {
      setDrivers(getAdminDrivers());
    }

    try {
      // 2. Fetch orders to calculate active loads
      const ordRes = await fetchOrders();
      if (ordRes && ordRes.success && Array.isArray(ordRes.data)) {
        setOrders(ordRes.data);
      } else {
        setOrders(getAdminOrders());
      }
    } catch {
      setOrders(getAdminOrders());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      setDrivers(getAdminDrivers());
      setOrders(getAdminOrders());
    };

    window.addEventListener('shift24-drivers-updated', handleUpdate);
    window.addEventListener('shift24-orders-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('shift24-drivers-updated', handleUpdate);
      window.removeEventListener('shift24-orders-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Compute active orders count for each driver
  const driverActiveOrdersMap = useMemo(() => {
    const map = new Map<string, AdminOrder[]>();
    orders.forEach(o => {
      if (o.driverId && o.status !== 'Delivered' && o.status !== 'Cancelled') {
        const list = map.get(o.driverId) || [];
        list.push(o);
        map.set(o.driverId, list);
      }
    });
    return map;
  }, [orders]);

  // Filtered drivers list
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const activeList = driverActiveOrdersMap.get(d.driverId || d.id) || [];
      const isActuallyOnDelivery = d.status === 'On Delivery' || activeList.length > 0;

      if (statusFilter !== 'All') {
        if (statusFilter === 'On Delivery' && !isActuallyOnDelivery) return false;
        if (statusFilter === 'Available' && (d.status !== 'Available' || activeList.length > 0)) return false;
        if (statusFilter === 'Off Duty' && d.status !== 'Off Duty') return false;
        if (statusFilter === 'Inactive' && d.status !== 'Inactive') return false;
      }

      if (vehicleFilter !== 'All' && d.vehicleType !== vehicleFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = d.name.toLowerCase().includes(q);
        const matchPhone = d.phone.toLowerCase().includes(q);
        const matchVehicle = (d.vehicleNumber || '').toLowerCase().includes(q);
        const matchZone = (d.currentZone || '').toLowerCase().includes(q);
        const matchId = (d.driverId || d.id).toLowerCase().includes(q);
        return matchName || matchPhone || matchVehicle || matchZone || matchId;
      }

      return true;
    });
  }, [drivers, statusFilter, vehicleFilter, searchTerm, driverActiveOrdersMap]);

  // Statistics
  const stats = useMemo(() => {
    const total = drivers.length;
    let available = 0;
    let onDelivery = 0;
    let offDutyOrInactive = 0;
    let totalAssignedOrders = 0;

    drivers.forEach(d => {
      const activeList = driverActiveOrdersMap.get(d.driverId || d.id) || [];
      totalAssignedOrders += activeList.length;

      if (d.status === 'Inactive' || d.status === 'Off Duty') {
        offDutyOrInactive++;
      } else if (d.status === 'On Delivery' || activeList.length > 0) {
        onDelivery++;
      } else {
        available++;
      }
    });

    return { total, available, onDelivery, offDutyOrInactive, totalAssignedOrders };
  }, [drivers, driverActiveOrdersMap]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedDriver(null);
    setFormName('');
    setFormPhone('+91 ');
    setFormEmail('');
    setFormVehicleType('Motorcycle');
    setFormVehicleNumber('');
    setFormLicenseNumber('');
    setFormStatus('Available');
    setFormCurrentZone('Kakkanad & Infopark');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver: AdminDriver) => {
    setModalMode('edit');
    setSelectedDriver(driver);
    setFormName(driver.name);
    setFormPhone(driver.phone);
    setFormEmail(driver.email || '');
    setFormVehicleType(driver.vehicleType || 'Motorcycle');
    setFormVehicleNumber(driver.vehicleNumber || '');
    setFormLicenseNumber(driver.licenseNumber || '');
    setFormStatus(driver.status || 'Available');
    setFormCurrentZone(driver.currentZone || 'Kakkanad & Infopark');
    setFormNotes(driver.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Please enter the driver full name');
      return;
    }
    if (!formPhone.trim() || formPhone.trim() === '+91') {
      toast.error('Please enter a valid contact phone number');
      return;
    }
    if (!formVehicleNumber.trim()) {
      toast.error('Please enter the vehicle registration plate number');
      return;
    }

    setSaving(true);
    const payload = {
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() ? formEmail.trim().toLowerCase() : undefined,
      vehicleType: formVehicleType,
      vehicleNumber: formVehicleNumber.trim().toUpperCase(),
      licenseNumber: formLicenseNumber.trim().toUpperCase() || undefined,
      status: formStatus,
      currentZone: formCurrentZone.trim(),
      notes: formNotes.trim() || undefined
    };

    try {
      if (modalMode === 'create') {
        // Try backend
        try {
          const res = await createBackendDriver(payload);
          if (res && res.success && res.data) {
            toast.success(`Driver ${formName} registered successfully!`);
          }
        } catch {}

        const updated = addAdminDriver(payload);
        setDrivers(updated);
        toast.success(`Driver ${formName} added to fleet!`);
      } else if (selectedDriver) {
        const id = selectedDriver.driverId || selectedDriver.id;
        try {
          await updateBackendDriver(id, payload);
        } catch {}

        const updated = updateAdminDriver(id, payload);
        setDrivers(updated);
        toast.success(`Driver ${formName} updated successfully!`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save driver');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!deleteConfirmDriver) return;
    setDeleting(true);
    const id = deleteConfirmDriver.driverId || deleteConfirmDriver.id;
    try {
      try {
        await deleteBackendDriver(id);
      } catch {}

      const updated = deleteAdminDriver(id);
      setDrivers(updated);
      toast.success(`Driver ${deleteConfirmDriver.name} deleted`);
      setDeleteConfirmDriver(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete driver');
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickStatusToggle = async (driver: AdminDriver, newStatus: AdminDriver['status']) => {
    const id = driver.driverId || driver.id;
    try {
      await updateBackendDriver(id, { status: newStatus });
    } catch {}
    const updated = updateAdminDriver(id, { status: newStatus });
    setDrivers(updated);
    toast.success(`${driver.name} status updated to ${newStatus}`);
  };

  const handleUnassignOrder = async (orderId: string) => {
    try {
      try {
        await assignDriverToBackendOrder(orderId, { driverId: '' });
      } catch {}

      const updatedOrders = orders.map(o => {
        if (o.id === orderId) {
          const copy: any = { ...o };
          delete copy.driverId;
          delete copy.driverName;
          delete copy.driverPhone;
          delete copy.driverVehicle;
          delete copy.assignedAt;
          return copy;
        }
        return o;
      });

      setOrders(updatedOrders);
      saveAdminOrders(updatedOrders);
      toast.success(`Order ${orderId} unassigned`);
    } catch {
      toast.error('Failed to unassign order');
    }
  };

  const getVehicleIcon = (type: AdminDriver['vehicleType']) => {
    switch (type) {
      case 'Motorcycle':
      case 'Scooter':
        return <Bike className="w-4 h-4" />;
      case 'Car':
      case 'Van':
        return <Car className="w-4 h-4" />;
      case 'Bicycle':
        return <Bike className="w-4 h-4" />;
      default:
        return <Truck className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivery Fleet & Drivers</h1>
              <p className="text-sm text-slate-500">
                Manage dispatch riders, track assigned orders, and coordinate daily meal deliveries.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-bold shadow-xs transition"
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Map & Dispatch</span>
          </Link>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 shadow-xs transition disabled:opacity-50"
            title="Refresh Drivers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Drivers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Fleet</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.total}</div>
          <p className="mt-1 text-xs text-slate-500">Active registered riders</p>
        </div>

        {/* Available Drivers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Available Now</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{stats.available}</div>
          <p className="mt-1 text-xs text-emerald-600/80 font-medium">Ready for immediate dispatch</p>
        </div>

        {/* On Delivery */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">On Delivery</span>
            <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-sky-700">{stats.onDelivery}</div>
          <p className="mt-1 text-xs text-sky-600/80 font-medium">{stats.totalAssignedOrders} meals currently in transit</p>
        </div>

        {/* Off Duty / Inactive */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Off Duty / Inactive</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-700">{stats.offDutyOrInactive}</div>
          <p className="mt-1 text-xs text-slate-400">Shift ended or resting</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, plate number (e.g. KL-07), zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 px-2 font-medium">Status:</span>
            {(['All', 'Available', 'On Delivery', 'Off Duty', 'Inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Vehicle Filter */}
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Vehicles</option>
            <option value="Motorcycle">Motorcycle</option>
            <option value="Scooter">Scooter</option>
            <option value="Car">Car</option>
            <option value="Van">Van</option>
            <option value="Bicycle">Bicycle</option>
          </select>
        </div>
      </div>

      {/* Drivers List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredDrivers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Truck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No drivers found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'All' || vehicleFilter !== 'All'
                ? 'Try adjusting your filters or search keywords.'
                : 'Get started by adding your first delivery driver to the fleet.'}
            </p>
            {searchTerm || statusFilter !== 'All' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                  setVehicleFilter('All');
                }}
                className="mt-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-extrabold text-slate-400 border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Driver Profile</th>
                  <th className="px-4 py-4">Contact</th>
                  <th className="px-4 py-4">Vehicle</th>
                  <th className="px-4 py-4">Operating Zone</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-center">Active Load</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrivers.map((driver) => {
                  const activeList = driverActiveOrdersMap.get(driver.driverId || driver.id) || [];
                  const isActuallyBusy = activeList.length > 0;
                  const cleanPhone = driver.phone.replace(/\D/g, '');

                  return (
                    <tr key={driver.id || driver.driverId} className="hover:bg-slate-50/60 transition group">
                      {/* Driver Profile */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {driver.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
                              {driver.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {driver.driverId || driver.id}
                              </span>
                              {driver.licenseNumber && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  DL: {driver.licenseNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-600 transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{driver.phone}</span>
                          </a>
                          {driver.email && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{driver.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                            {getVehicleIcon(driver.vehicleType)}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-800 tracking-tight font-mono">
                              {driver.vehicleNumber}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {driver.vehicleType}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Zone */}
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100/80 px-2 py-1 rounded-lg">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold">{driver.currentZone || 'Kakkanad'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={isActuallyBusy ? 'On Delivery' : driver.status}
                            onChange={(e) => handleQuickStatusToggle(driver, e.target.value as AdminDriver['status'])}
                            className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                              isActuallyBusy || driver.status === 'On Delivery'
                                ? 'bg-sky-50 text-sky-800 border-sky-300'
                                : driver.status === 'Available'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            <option value="Available">Available</option>
                            <option value="On Delivery">On Delivery</option>
                            <option value="Off Duty">Off Duty</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      </td>

                      {/* Active Load */}
                      <td className="px-4 py-4 text-center">
                        {activeList.length > 0 ? (
                          <button
                            onClick={() => setDeliveriesModalDriver(driver)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg text-xs font-black transition cursor-pointer shadow-xs"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>{activeList.length} Meals</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Idle</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Direct WhatsApp message */}
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                              `Hello ${driver.name}, this is Shift24 Dispatch Hub.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Message on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                          </a>

                          {/* View assigned orders */}
                          {activeList.length > 0 && (
                            <button
                              onClick={() => setDeliveriesModalDriver(driver)}
                              className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                              title="View assigned deliveries"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit driver */}
                          <button
                            onClick={() => handleOpenEdit(driver)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Driver"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete driver */}
                          <button
                            onClick={() => setDeleteConfirmDriver(driver)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Driver"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Driver Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900">
                    {modalMode === 'create' ? 'Register New Driver' : 'Edit Driver Profile'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalMode === 'create' ? 'Add a delivery partner to your fleet.' : 'Update vehicle or contact details.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98470 12345"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="driver@shift24.food"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Type *</label>
                  <select
                    value={formVehicleType}
                    onChange={(e) => setFormVehicleType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="Motorcycle">Motorcycle (Bike)</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Car">Car</option>
                    <option value="Van">Delivery Van</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Registration Plate *</label>
                  <input
                    type="text"
                    required
                    placeholder="KL-07-CB-2341"
                    value={formVehicleNumber}
                    onChange={(e) => setFormVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Operating Zone</label>
                  <input
                    type="text"
                    placeholder="e.g. Kakkanad & Infopark"
                    value={formCurrentZone}
                    onChange={(e) => setFormCurrentZone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Driving License (Optional)</label>
                  <input
                    type="text"
                    placeholder="KL0720180045129"
                    value={formLicenseNumber}
                    onChange={(e) => setFormLicenseNumber(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Available', 'Off Duty', 'Inactive'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        formStatus === st
                          ? st === 'Available'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Dispatch Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Special shift notes, emergency contact, or preferred route..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : modalMode === 'create' ? 'Register Driver' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deliveries Viewer Modal */}
      {deliveriesModalDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900">
                    Active Deliveries: {deliveriesModalDriver.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {deliveriesModalDriver.vehicleType} • {deliveriesModalDriver.vehicleNumber} • 📞 {deliveriesModalDriver.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeliveriesModalDriver(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {(() => {
                const assigned = driverActiveOrdersMap.get(deliveriesModalDriver.driverId || deliveriesModalDriver.id) || [];
                if (assigned.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400">
                      No active orders currently assigned to this driver.
                    </div>
                  );
                }

                return assigned.map((ord, idx) => (
                  <div
                    key={ord.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-md">
                          Stop #{idx + 1}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600">
                          {ord.id}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {ord.mealType}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {ord.deliveryTimeSlot}
                        </span>
                      </div>

                      <div className="font-extrabold text-slate-900 text-sm">
                        {ord.customerName} • 📞 {ord.customerPhone}
                      </div>

                      <div className="text-xs text-slate-500 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{ord.address}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={ord.coordinates?.lat && ord.coordinates?.lng 
                          ? `https://www.google.com/maps/dir/?api=1&destination=${ord.coordinates.lat},${ord.coordinates.lng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ord.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Directions</span>
                      </a>

                      <button
                        onClick={() => handleUnassignOrder(ord.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition"
                      >
                        Unassign
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/admin/orders"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
              >
                <span>Open Orders & Dispatch Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setDeliveriesModalDriver(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-center text-lg">Delete Driver?</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Are you sure you want to remove <strong className="text-slate-800">{deleteConfirmDriver.name}</strong> ({deleteConfirmDriver.driverId || deleteConfirmDriver.id}) from the fleet? Active orders will be unassigned.
            </p>

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDriver(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDriver}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
