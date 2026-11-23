import { prisma } from "@/lib/prisma";

export interface CompanySettings {
  id: string;
  name: string;
  businessType: string | null;
  address: string | null;
  contactEmail: string | null;
  phone: string | null;
  currency: string;
  timezone: string;
  fiscalYearStartMonth: number;
  createdAt: string;
  userCount: number;
  productCount: number;
}

export async function getCompanySettings(
  companyId: string,
): Promise<CompanySettings | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      businessType: true,
      address: true,
      contactEmail: true,
      phone: true,
      currency: true,
      timezone: true,
      fiscalYearStartMonth: true,
      createdAt: true,
      _count: { select: { users: true, products: true } },
    },
  });

  if (!company) return null;

  return {
    id: company.id,
    name: company.name,
    businessType: company.businessType,
    address: company.address,
    contactEmail: company.contactEmail,
    phone: company.phone,
    currency: company.currency,
    timezone: company.timezone,
    fiscalYearStartMonth: company.fiscalYearStartMonth,
    createdAt: company.createdAt.toISOString(),
    userCount: company._count.users,
    productCount: company._count.products,
  };
}
