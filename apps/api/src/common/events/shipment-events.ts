export class ShipmentStageChangedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly shipmentId: string,
    public readonly jobFileNumber: string,
    public readonly fromStage: string | null,
    public readonly toStage: string,
    public readonly actorName: string | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
