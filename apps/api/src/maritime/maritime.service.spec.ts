import { MaritimeService } from './maritime.service';

describe('MaritimeService', () => {
  let service: MaritimeService;

  beforeEach(() => {
    service = new MaritimeService();
  });

  describe('validateContainerNumber (ISO 6346)', () => {
    it('accepts a valid container number', () => {
      const result = service.validateContainerNumber('CSQU3054383');
      expect(result.isValid).toBe(true);
      expect(result.ownerCode).toBe('CSQ');
      expect(result.equipmentCategory).toBe('U');
      expect(result.serialNumber).toBe('305438');
      expect(result.checkDigit).toBe(3);
      expect(result.calculatedCheckDigit).toBe(3);
      expect(result.errorMessage).toBeUndefined();
    });

    it('normalizes lowercase input and strips spaces/dashes before validating', () => {
      const result = service.validateContainerNumber('csqu-3054 383');
      expect(result.isValid).toBe(true);
    });

    it('rejects numbers that are not exactly 11 characters', () => {
      const short = service.validateContainerNumber('CSQU305438');
      expect(short.isValid).toBe(false);
      expect(short.errorMessage).toBe('Must be exactly 11 characters');

      const long = service.validateContainerNumber('CSQU30543831');
      expect(long.isValid).toBe(false);
      expect(long.errorMessage).toBe('Must be exactly 11 characters');
    });

    it('rejects an invalid check digit and reports the calculated one', () => {
      const result = service.validateContainerNumber('TEST1234567');
      expect(result.isValid).toBe(false);
      expect(result.calculatedCheckDigit).toBe(0);
      expect(result.errorMessage).toContain('Invalid check digit');
    });
  });

  describe('ports', () => {
    it('finds a port by UN/LOCODE case-insensitively', () => {
      const port = service.getPortByUnlocode('egaly');
      expect(port).not.toBeNull();
      expect(port!.unlocode).toBe('EGALY');
      expect(port!.name).toBe('Port of Alexandria');
    });

    it('returns null for an unknown UN/LOCODE', () => {
      expect(service.getPortByUnlocode('ZZZZZ')).toBeNull();
    });

    it('filters ports by country code', () => {
      const egyptPorts = service.getAllPorts(undefined, 'EG', undefined);
      expect(egyptPorts.length).toBeGreaterThan(0);
      expect(egyptPorts.every((p) => p.countryCode === 'EG')).toBe(true);
    });

    it('filters ports by type', () => {
      const dryPorts = service.getAllPorts(undefined, undefined, 'dry');
      expect(dryPorts.length).toBeGreaterThan(0);
      expect(dryPorts.every((p) => p.isDryPort)).toBe(true);
    });

    it('searches ports by query across name and code', () => {
      const byName = service.getAllPorts('alexandria');
      expect(byName.some((p) => p.unlocode === 'EGALY')).toBe(true);

      const byCode = service.getAllPorts('cnngb');
      expect(byCode.some((p) => p.unlocode === 'CNNGB')).toBe(true);
    });
  });

  describe('trade corridors', () => {
    it('returns all corridors when no type filter is given', () => {
      expect(service.getTradeCorridors().length).toBeGreaterThan(0);
    });

    it('filters corridors by type', () => {
      const land = service.getTradeCorridors('land');
      expect(land.length).toBeGreaterThan(0);
      expect(land.every((c) => c.type === 'land')).toBe(true);
    });

    it('finds a corridor by id or code', () => {
      expect(service.getTradeCorridorById('cor-cairo-capetown')).not.toBeNull();
      expect(service.getTradeCorridorById('TAH-4')).not.toBeNull();
      expect(service.getTradeCorridorById('does-not-exist')).toBeNull();
    });
  });

  describe('currencies', () => {
    it('returns the supported currency list including USD base', () => {
      const currencies = service.getCurrencies();
      const usd = currencies.find((c) => c.code === 'USD');
      expect(usd).toBeDefined();
      expect(usd!.isBase).toBe(true);
      expect(usd!.rateToUsd).toBe(1.0);
    });
  });

  describe('countries', () => {
    it('returns the full country list with Arabic names', () => {
      const countries = service.getAllCountries();
      expect(countries.length).toBeGreaterThan(200);
      const egypt = countries.find((c) => c.cca2 === 'EG');
      expect(egypt).toBeDefined();
      expect(egypt!.nameEn).toBe('Egypt');
      expect(egypt!.nameAr!.length).toBeGreaterThan(0);
    });
  });

  describe('calculateSeaDistance', () => {
    it('computes nautical miles and transit days between two known ports', () => {
      const { nauticalMiles, transitDays } = service.calculateSeaDistance('EGALY', 'EGEDK');
      expect(nauticalMiles).toBeGreaterThan(0);
      expect(transitDays).toBeGreaterThanOrEqual(1);
    });

    it('returns zeros when a port code is unknown', () => {
      const result = service.calculateSeaDistance('EGALY', 'ZZZZZ');
      expect(result).toEqual({ nauticalMiles: 0, transitDays: 0 });
    });

    it('is symmetric for distance magnitude', () => {
      const ab = service.calculateSeaDistance('CNSGH', 'NLRTM');
      const ba = service.calculateSeaDistance('NLRTM', 'CNSGH');
      expect(ab.nauticalMiles).toBe(ba.nauticalMiles);
      expect(ab.nauticalMiles).toBeGreaterThan(1000); // real intercontinental leg
    });
  });
});
