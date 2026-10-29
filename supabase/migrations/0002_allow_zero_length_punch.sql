alter table public.punches drop constraint punches_check;
alter table public.punches add constraint punches_out_after_in check (clock_out is null or clock_out >= clock_in);
