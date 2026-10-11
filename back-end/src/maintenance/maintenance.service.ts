import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService, MaintenanceSchedule } from '../data-store/data-store.service';
import { CreateMaintenanceDto, UpdateMaintenanceDto } from './dto/maintenance.dto';

type Requester = { userId: string; role: string };

@Injectable()
export class MaintenanceService {
  constructor(private readonly store: DataStoreService) {}

  private syncVehicleStatus(vehiclePlate: string): void {
    const vehicle = this.store.vehicles.find(
      (item) => String(item.plate || '').toLowerCase().trim() === String(vehiclePlate || '').toLowerCase().trim(),
    );
    if (!vehicle) return;

    const hasActiveMaintenance = this.store.maintenanceSchedules.some(
      (item) =>
        String(item.vehicle || '').toLowerCase().trim() === String(vehiclePlate || '').toLowerCase().trim() &&
        ['in progress', 'under maintenance'].includes(String(item.status || '').toLowerCase().trim()),
    );
    const hasActiveTrip = this.store.trips.some(
      (trip) =>
        String(trip.vehicle || '').toLowerCase().trim() === String(vehiclePlate || '').toLowerCase().trim() &&
        ['accepted', 'picked up', 'in transit', 'issue reported'].includes(String(trip.status || '').toLowerCase().trim()),
    );

    vehicle.status = hasActiveMaintenance ? 'Maintenance' : hasActiveTrip ? 'On Trip' : 'Active';
    vehicle.availability = vehicle.status === 'Active' ? 'Available' : 'Unavailable';
    this.store.persistVehicles();
  }

  findAll(search?: string, requester?: Requester): MaintenanceSchedule[] {
    let items = [...this.store.maintenanceSchedules];

    if (requester && requester.role === 'fleet-manager') {
      items = items.filter(
        (m) => !m.fleetManagerId || m.fleetManagerId === requester.userId,
      );
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((m) => JSON.stringify(m).toLowerCase().includes(q));
    }
    return items;
  }

  findOne(id: string, requester?: Requester): MaintenanceSchedule {
    const item = this.store.maintenanceSchedules.find((m) => m.id === id);
    if (!item) throw new NotFoundException(`Maintenance schedule "${id}" not found`);

    if (
      requester &&
      requester.role === 'fleet-manager' &&
      item.fleetManagerId &&
      item.fleetManagerId !== requester.userId
    ) {
      throw new NotFoundException(`Maintenance schedule "${id}" not found`);
    }

    return item;
  }

  create(dto: CreateMaintenanceDto, requester?: Requester): MaintenanceSchedule {
    const id = 'MT-2026-' + String(Date.now()).slice(-4);
    const schedule: MaintenanceSchedule = {
      id,
      vehicle: dto.vehicle,
      issue: dto.issue,
      priority: dto.priority,
      status: 'Scheduled',
      date: dto.date,
      mechanic: dto.mechanic,
      cost: dto.cost || '--',
      notes: dto.notes || '',
      fleetManagerId: requester?.role === 'fleet-manager' ? requester.userId : undefined,
    };
    this.store.maintenanceSchedules.unshift(schedule);
    this.store.persistMaintenance();
    this.syncVehicleStatus(schedule.vehicle);
    return schedule;
  }

  update(id: string, dto: UpdateMaintenanceDto, requester?: Requester): MaintenanceSchedule {
    const idx = this.store.maintenanceSchedules.findIndex((m) => m.id === id);
    if (idx < 0) throw new NotFoundException(`Maintenance schedule "${id}" not found`);

    if (
      requester &&
      requester.role === 'fleet-manager' &&
      this.store.maintenanceSchedules[idx].fleetManagerId &&
      this.store.maintenanceSchedules[idx].fleetManagerId !== requester.userId
    ) {
      throw new NotFoundException(`Maintenance schedule "${id}" not found`);
    }

    const previousVehicle = this.store.maintenanceSchedules[idx].vehicle;
    const definedUpdates = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
    this.store.maintenanceSchedules[idx] = { ...this.store.maintenanceSchedules[idx], ...definedUpdates };
    this.store.persistMaintenance();
    this.syncVehicleStatus(previousVehicle);
    this.syncVehicleStatus(this.store.maintenanceSchedules[idx].vehicle);
    return this.store.maintenanceSchedules[idx];
  }

  remove(id: string, requester?: Requester): { message: string } {
    const idx = this.store.maintenanceSchedules.findIndex((m) => m.id === id);
    if (idx < 0) throw new NotFoundException(`Maintenance schedule "${id}" not found`);

    if (
      requester &&
      requester.role === 'fleet-manager' &&
      this.store.maintenanceSchedules[idx].fleetManagerId &&
      this.store.maintenanceSchedules[idx].fleetManagerId !== requester.userId
    ) {
      throw new NotFoundException(`Maintenance schedule "${id}" not found`);
    }

    const vehicle = this.store.maintenanceSchedules[idx].vehicle;
    this.store.maintenanceSchedules.splice(idx, 1);
    this.store.persistMaintenance();
    this.syncVehicleStatus(vehicle);
    return { message: `Maintenance schedule "${id}" deleted` };
  }
}
