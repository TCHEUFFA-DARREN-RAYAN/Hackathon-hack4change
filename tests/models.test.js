/**
 * Model layer tests (with DB mocking)
 * Verifies the model functions call the correct SQL queries.
 */

const mockQuery = jest.fn();
jest.mock('../backend/config/database', () => ({
    promisePool: { query: mockQuery, getConnection: jest.fn() },
    pool: { end: jest.fn() },
    testConnection: jest.fn().mockResolvedValue(true),
}));

beforeEach(() => {
    mockQuery.mockReset();
});

describe('OrganizationModel', () => {
    const OrganizationModel = require('../backend/models/organization.model');

    test('findAll queries all organizations', async () => {
        mockQuery.mockResolvedValue([[{ id: '1', name: 'Org A' }]]);
        const result = await OrganizationModel.findAll();
        expect(mockQuery).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Org A');
    });

    test('findById queries by specific ID', async () => {
        mockQuery.mockResolvedValue([[{ id: 'abc', name: 'Test Org' }]]);
        const result = await OrganizationModel.findById('abc');
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE'),
            ['abc']
        );
        expect(result.name).toBe('Test Org');
    });

    test('findById returns null for missing org', async () => {
        mockQuery.mockResolvedValue([[]]);
        const result = await OrganizationModel.findById('missing');
        expect(result).toBeNull();
    });
});

describe('NeedsModel', () => {
    const NeedsModel = require('../backend/models/needs.model');

    test('findAll returns active needs', async () => {
        mockQuery.mockResolvedValue([[
            { id: 'n1', item_name: 'blankets', urgency: 'critical' },
        ]]);
        const result = await NeedsModel.findAll({});
        expect(mockQuery).toHaveBeenCalled();
        expect(result[0].item_name).toBe('blankets');
    });

    test('create inserts a new need', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
        mockQuery.mockResolvedValueOnce([[{
            id: 'new-id', item_name: 'coats', category: 'clothing',
            urgency: 'high', org_id: 'o1'
        }]]);

        const result = await NeedsModel.create({
            org_id: 'o1',
            item_name: 'coats',
            category: 'clothing',
            quantity_needed: 10,
            unit: 'items',
            urgency: 'high',
        });

        expect(mockQuery).toHaveBeenCalledTimes(2);
        const insertCall = mockQuery.mock.calls[0][0];
        expect(insertCall).toContain('INSERT');
    });
});

describe('DonationModel', () => {
    const DonationModel = require('../backend/models/donation.model');

    test('findAll queries donations', async () => {
        mockQuery.mockResolvedValue([[{ id: 'd1', item_name: 'food', status: 'pending' }]]);
        const result = await DonationModel.findAll({});
        expect(mockQuery).toHaveBeenCalled();
        expect(result[0].item_name).toBe('food');
    });

    test('create inserts donation with UUID', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
        mockQuery.mockResolvedValueOnce([[{
            id: 'uuid', donor_name: 'Jane', item_name: 'books'
        }]]);

        const result = await DonationModel.create({
            donor_name: 'Jane',
            donor_email: 'jane@test.com',
            item_name: 'books',
            category: 'other',
            quantity: 5,
        });

        expect(mockQuery).toHaveBeenCalled();
        const insertCall = mockQuery.mock.calls[0][0];
        expect(insertCall).toContain('INSERT');
    });
});

describe('AdminModel', () => {
    const AdminModel = require('../backend/models/admin.model');

    test('findByEmail queries with LOWER() for case-insensitive lookup', async () => {
        mockQuery.mockResolvedValue([[{ id: 'a1', email: 'admin@test.com' }]]);
        const result = await AdminModel.findByEmail('Admin@Test.com');
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('LOWER'),
            expect.arrayContaining(['Admin@Test.com'])
        );
    });

    test('findByEmail returns null when not found', async () => {
        mockQuery.mockResolvedValue([[]]);
        const result = await AdminModel.findByEmail('nobody@test.com');
        expect(result).toBeNull();
    });
});

describe('SurplusRequestModel', () => {
    const SurplusRequestModel = require('../backend/models/surplusRequest.model');

    test('create inserts a surplus request', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
        mockQuery.mockResolvedValueOnce([[{
            id: 'sr1', requesting_org_id: 'o1', from_org_id: 'o2',
            inventory_item_id: 'i1', quantity_requested: 5
        }]]);

        const result = await SurplusRequestModel.create({
            requesting_org_id: 'o1',
            from_org_id: 'o2',
            inventory_item_id: 'i1',
            quantity_requested: 5,
        });

        expect(mockQuery).toHaveBeenCalled();
    });
});
