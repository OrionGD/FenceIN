import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CheckInDto } from './attendance.dto';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: PrismaService;
  let eventsGateway: EventsGateway;

  beforeEach(async () => {
    const mockPrismaService = {
      attendance: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      workerSite: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ tenantId: 'tenant-123' }),
      },
    };

    const mockEventsGateway = {
      emitAttendanceEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get<PrismaService>(PrismaService);
    eventsGateway = module.get<EventsGateway>(EventsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkIn', () => {
    const mockCheckInDto: CheckInDto = {
      userId: 'user-123',
      confidence: 0.95,
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
    };

    it('should throw BadRequestException if accuracy > 50', async () => {
      const dto = { ...mockCheckInDto, accuracy: 60 };
      await expect(service.checkIn(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already checked in today', async () => {
      (prisma.attendance.findFirst as jest.Mock).mockResolvedValue({ id: 'att-123' });
      await expect(service.checkIn(mockCheckInDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no GPS location is provided', async () => {
      const dto = { ...mockCheckInDto, latitude: undefined, longitude: undefined };
      (prisma.attendance.findFirst as jest.Mock).mockResolvedValue(null); // not checked in
      await expect(service.checkIn(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should successfully check in with valid location and no geofence assignment', async () => {
      (prisma.attendance.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.workerSite.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.attendance.create as jest.Mock).mockResolvedValue({ id: 'att-1' });

      const result = await service.checkIn(mockCheckInDto);

      expect(result).toEqual({ id: 'att-1' });
      expect(prisma.attendance.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-123',
          geofenceStatus: 'NO_SITE_ASSIGNED',
        })
      }));
      expect(eventsGateway.emitAttendanceEvent).toHaveBeenCalledWith({ type: 'CHECK_IN', data: { id: 'att-1' } }, 'tenant-123');
    });
  });

  describe('checkOut', () => {
    it('should throw NotFoundException if no active check-in', async () => {
      (prisma.attendance.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.checkOut('user-123')).rejects.toThrow(NotFoundException);
    });

    it('should check out successfully', async () => {
      (prisma.attendance.findFirst as jest.Mock).mockResolvedValue({ id: 'att-123', checkIn: new Date() });
      (prisma.attendance.update as jest.Mock).mockResolvedValue({ id: 'att-123', checkOut: new Date() });

      const result = await service.checkOut('user-123');

      expect(result).toHaveProperty('checkOut');
      expect(eventsGateway.emitAttendanceEvent).toHaveBeenCalledWith({ type: 'CHECK_OUT', data: expect.any(Object) }, 'tenant-123');
    });
  });
});
