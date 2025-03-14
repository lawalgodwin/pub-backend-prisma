import { User as PrismaUser } from "@prisma/client";

export class Users implements PrismaUser {
    user_id: string;
    name: string;
    email: string;
    phone_number: string;
    password_hash: string;
    default_location_id: string | null;
    created_at: Date;
    updated_at: Date
}
