-- daVIRA.io Database Schema

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type TEXT CHECK (plan_type IN ('monthly', 'biannual', 'yearly', 'referral_vip')),
  status TEXT CHECK (status IN ('active', 'expired', 'canceled')),
  payment_method TEXT CHECK (payment_method IN ('crypto_usdc', 'stripe', 'referral')),
  amount_paid DECIMAL(10, 2),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tracked_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL UNIQUE,
  label TEXT,
  archetype TEXT,
  win_rate DECIMAL(5, 2),
  pnl_7d DECIMAL(12, 2),
  sybil_group_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
