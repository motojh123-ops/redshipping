import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ShipmentType,
  Incoterm,
  ShipmentStage,
  ContainerType,
  ContainerStatus,
} from '@banna/shared-types';

export class CreateShipmentContainerDto {
  @IsString()
  @IsNotEmpty()
  containerNumber: string;

  @IsEnum(ContainerType)
  @IsOptional()
  containerType?: ContainerType;

  @IsString()
  @IsOptional()
  sealNumber?: string;

  @IsNumber()
  @IsOptional()
  tareWeightKg?: number;

  @IsNumber()
  @IsOptional()
  cargoWeightKg?: number;

  @IsEnum(ContainerStatus)
  @IsOptional()
  status?: ContainerStatus;
}

export class CreateShipmentDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsEnum(ShipmentType)
  @IsOptional()
  shipmentType?: ShipmentType;

  @IsEnum(Incoterm)
  @IsOptional()
  incoterm?: Incoterm;

  @IsString()
  @IsOptional()
  originPortId?: string;

  @IsString()
  @IsOptional()
  destinationPortId?: string;

  @IsString()
  @IsOptional()
  shippingLineId?: string;

  @IsString()
  @IsOptional()
  overseasAgentId?: string;

  @IsString()
  @IsOptional()
  salesRepId?: string;

  @IsString()
  @IsOptional()
  opsOfficerId?: string;

  @IsEnum(ShipmentStage)
  @IsOptional()
  currentStage?: ShipmentStage;

  @IsString()
  @IsOptional()
  blNumber?: string;

  @IsString()
  @IsOptional()
  vesselName?: string;

  @IsString()
  @IsOptional()
  voyageNumber?: string;

  @IsString()
  @IsOptional()
  etd?: string;

  @IsString()
  @IsOptional()
  eta?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  freeDaysAllowed?: number;

  @IsString()
  @IsOptional()
  cargoDescription?: string;

  @IsNumber()
  @IsOptional()
  grossWeightKg?: number;

  @IsNumber()
  @IsOptional()
  volumeCbm?: number;

  @IsNumber()
  @IsOptional()
  packageCount?: number;

  @IsString()
  @IsOptional()
  packageType?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShipmentContainerDto)
  @IsOptional()
  containers?: CreateShipmentContainerDto[];
}

export class UpdateShipmentStageDto {
  @IsEnum(ShipmentStage)
  @IsNotEmpty()
  stage: ShipmentStage;

  @IsString()
  @IsOptional()
  notes?: string;
}
