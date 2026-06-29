"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseReady = Boolean(url && anonKey);

export const supabase = isSupabaseReady ? createClient(url!, anonKey!) : null;
