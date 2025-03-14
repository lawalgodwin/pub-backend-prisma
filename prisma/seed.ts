import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Helper to generate credit card expiry date in MM/YY format
function getCreditCardExpiry(): string {
  const futureDate = faker.date.future();
  const month = (futureDate.getMonth() + 1).toString().padStart(2, '0');
  const year = futureDate.getFullYear().toString().slice(-2);
  return `${month}/${year}`;
}

async function seedDatabase() {
  // Clear existing data in a proper order to avoid FK constraints issues
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.card.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.deliveryUpdate.deleteMany();
  await prisma.parcelAssignment.deleteMany();
  await prisma.parcel.deleteMany();
  await prisma.locker.deleteMany();
  await prisma.location.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  // Seed Users (200)
  const users = Array.from({ length: 200 }, () => ({
    user_id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone_number: faker.phone.number(),
    password_hash: faker.internet.password(),
    default_location_id: null,
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
  }));
  await prisma.user.createMany({ data: users });

  // Seed Locations (100)
  const locations = Array.from({ length: 100 }, () => ({
    location_id: faker.string.uuid(),
    address: faker.location.streetAddress(),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
    // Optionally associate each location with a user
    userUser_id: faker.helpers.arrayElement(users).user_id,
  }));
  await prisma.location.createMany({ data: locations });

  // Seed Lockers (200)
  const lockers = Array.from({ length: 200 }, () => ({
    locker_id: faker.string.uuid(),
    location_id: faker.helpers.arrayElement(locations).location_id,
    locker_code: faker.string.alphanumeric(6),
    is_available: faker.datatype.boolean(),
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
  }));
  await prisma.locker.createMany({ data: lockers });

  // Seed Items (200)
  const items = Array.from({ length: 200 }, () => ({
    item_id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.number.float({ min: 10, max: 1000 }).toFixed(2)),
    size: faker.commerce.productAdjective(),
    weight: parseFloat(faker.number.float({ min: 0.5, max: 10 }).toFixed(2)),
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
  }));
  await prisma.item.createMany({ data: items });

  // Seed Merchants (50) – choose 50 random users to be merchants
  const merchantUsers = faker.helpers.arrayElements(users, 50);
  const merchants = merchantUsers.map(user => ({
    merchant_id: faker.string.uuid(),
    user_id: user.user_id,
    business_name: faker.company.name(),
    contact_person: faker.person.fullName(),
    contact_email: faker.internet.email(),
    contact_phone: faker.phone.number(),
    address_id: faker.helpers.arrayElement(locations).location_id,
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
  }));
  await prisma.merchant.createMany({ data: merchants });

  // Seed Drivers (50) – choose 50 random users to be drivers
  const driverUsers = faker.helpers.arrayElements(users, 50);
  const drivers = driverUsers.map(user => ({
    driver_id: faker.string.uuid(),
    user_id: user.user_id,
    vehicle_info: faker.vehicle.model(),
    license_number: faker.string.alphanumeric(10),
    status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE']),
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
  }));
  await prisma.driver.createMany({ data: drivers });

  // Seed Cards (300)
  const cards = Array.from({ length: 300 }, () => ({
    card_id: faker.string.uuid(),
    user_id: faker.helpers.arrayElement(users).user_id,
    card_number: faker.finance.creditCardNumber(),
    expiry_date: getCreditCardExpiry(),
    cvv: faker.finance.creditCardCVV(),
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
  }));
  await prisma.card.createMany({ data: cards });

  // Seed WalletTransactions (500)
  const walletTransactions = Array.from({ length: 500 }, () => ({
    transaction_id: faker.string.uuid(),
    user_id: faker.helpers.arrayElement(users).user_id,
    amount: parseFloat(faker.number.float({ min: 10, max: 1000 }).toFixed(2)),
    transaction_type: faker.helpers.arrayElement(['CREDIT', 'DEBIT']),
    transaction_date: faker.date.recent(),
    payment_method: faker.helpers.arrayElement(['BANK_TRANSFER', 'CARD']),
  }));
  await prisma.walletTransaction.createMany({ data: walletTransactions });

  // Seed Parcels (1000)
  const parcels = Array.from({ length: 1000 }, () => ({
    parcel_id: faker.string.uuid(),
    sender_id: faker.helpers.arrayElement(users).user_id,
    receiver_id: faker.helpers.arrayElement(users).user_id,
    pickup_locker_id: faker.helpers.arrayElement(lockers).locker_id,
    destination_locker_id: faker.helpers.arrayElement(lockers).locker_id,
    weight: parseFloat(faker.number.float({ min: 0.5, max: 50 }).toFixed(2)),
    type: faker.helpers.arrayElement(['FRAGILE', 'DURABLE']),
    insurance_package: faker.datatype.boolean(),
    parcel_value: parseFloat(faker.number.float({ min: 10, max: 500 }).toFixed(2)),
    insurance_amount: parseFloat(faker.number.float({ min: 5, max: 100 }).toFixed(2)),
    tracking_id: faker.string.uuid(),
    status: faker.helpers.arrayElement(['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
  }));
  await prisma.parcel.createMany({ data: parcels });

  // Seed DeliveryUpdates (1 to 5 updates per parcel)
  let deliveryUpdates = [];
  for (const parcel of parcels) {
    const updatesCount = faker.number.int({ min: 1, max: 5 });
    for (let i = 0; i < updatesCount; i++) {
      deliveryUpdates.push({
        delivery_update_id: faker.string.uuid(),
        parcel_id: parcel.parcel_id,
        status: faker.helpers.arrayElement(['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
        updated_at: faker.date.recent(),
      });
    }
  }
  await prisma.deliveryUpdate.createMany({ data: deliveryUpdates });

  // Seed Orders (500)
  const orders = Array.from({ length: 500 }, () => ({
    order_id: faker.string.uuid(),
    user_id: faker.helpers.arrayElement(users).user_id,
    merchant_id: faker.helpers.arrayElement(merchants)?.merchant_id || null,
    order_date: faker.date.recent(),
    total_cost: parseFloat(faker.number.float({ min: 50, max: 500 }).toFixed(2)),
    delivery_cost: parseFloat(faker.number.float({ min: 5, max: 50 }).toFixed(2)),
    insurance_amount: parseFloat(faker.number.float({ min: 10, max: 100 }).toFixed(2)),
  }));
  await prisma.order.createMany({ data: orders });

  // Seed OrderItems (1 to 5 items per order)
  let orderItems = [];
  for (const order of orders) {
    const itemsCount = faker.number.int({ min: 1, max: 5 });
    for (let i = 0; i < itemsCount; i++) {
      orderItems.push({
        order_item_id: faker.string.uuid(),
        order_id: order.order_id,
        item_id: faker.helpers.arrayElement(items).item_id,
        quantity: faker.number.int({ min: 1, max: 10 }),
      });
    }
  }
  await prisma.orderItem.createMany({ data: orderItems });

  // Seed ParcelAssignments (1 to 3 assignments per parcel)
  let parcelAssignments = [];
  for (const parcel of parcels) {
    const assignmentsCount = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < assignmentsCount; i++) {
      parcelAssignments.push({
        assignment_id: faker.string.uuid(),
        parcel_id: parcel.parcel_id,
        driver_id: faker.helpers.arrayElement(drivers).driver_id,
        assigned_at: faker.date.recent(),
        status: faker.helpers.arrayElement(['ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED']),
      });
    }
  }
  await prisma.parcelAssignment.createMany({ data: parcelAssignments });

  console.log('Database seeded successfully!');
}

seedDatabase()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
