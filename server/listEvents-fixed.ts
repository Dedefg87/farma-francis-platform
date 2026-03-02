  listEvents: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "closed", "cancelled"]).optional(),
      motherCustomerId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      if (input.status) conditions.push(eq(babyShowerEvents.status, input.status));
      if (input.motherCustomerId) conditions.push(eq(babyShowerEvents.motherCustomerId, input.motherCustomerId));

      const query = db.select({
        event: babyShowerEvents,
        motherName: customers.name,
        motherPhone: customers.phone,
      }).from(babyShowerEvents).leftJoin(customers, eq(babyShowerEvents.motherCustomerId, customers.id));

      if (conditions.length > 0) {
        return await query.where(and(...conditions))
          .orderBy(desc(babyShowerEvents.createdAt))
          .limit(input.limit)
          .offset(input.offset);
      }

      return await query.orderBy(desc(babyShowerEvents.createdAt)).limit(input.limit).offset(input.offset);
    }),
