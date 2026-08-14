import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types/supabase";

const supabase = createClient<Database>("", "");

async function test() {
  const { data } = await supabase.from("products").select("id").maybeSingle();
  if (data) {
    console.log(data.id);
  }
}
