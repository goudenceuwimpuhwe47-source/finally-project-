// Lightweight stub for Supabase client.
// The project was migrated away from Supabase. Keep a safe stub here so
// that any remaining imports do not trigger network requests to the
// old Supabase project or crash the app in development.
// Replace this with a real client or remove usages once migration is complete.

type AnyFn = (...args: any[]) => Promise<any>;

const noopAsync = async (..._args: any[]) => ({ data: null, error: null });

const tableProxy = (tableName: string) => ({
	select: noopAsync,
	insert: noopAsync,
	update: noopAsync,
	delete: noopAsync,
	upsert: noopAsync,
	eq: () => tableProxy(tableName),
	order: () => tableProxy(tableName),
	limit: () => tableProxy(tableName),
});

export const supabase = {
	from: (table: string) => tableProxy(table),
	auth: {
		// Methods used in the codebase. Return neutral successful shapes.
		updateUser: noopAsync as AnyFn,
		getUser: noopAsync as AnyFn,
		signInWithPassword: noopAsync as AnyFn,
		signUp: noopAsync as AnyFn,
		user: null,
	},
	storage: {
		from: () => ({ upload: noopAsync as AnyFn, download: noopAsync as AnyFn }),
	},
	functions: { invoke: noopAsync as AnyFn },
	// realtime / other apis can be added here if needed
} as any;