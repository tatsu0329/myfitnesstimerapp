import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../utils/supabase";

export async function PATCH(req: NextRequest) {
  try {
    // Avoid using `params` object by parsing the ID directly from the URL.
    const id = req.nextUrl.pathname.split("/").pop();
    const { sets, totalTime } = await req.json();

    if (
      !id ||
      typeof sets === "undefined" ||
      typeof totalTime === "undefined"
    ) {
      return NextResponse.json(
        { message: "Missing required fields (id, sets, totalTime)." },
        { status: 400 }
      );
    }

    // By not using .select(), we make the operation more resilient to replication lag.
    // We only care if the update succeeded, not about getting the updated row back.
    const { error } = await supabase
      .from("history")
      .update({ sets, duration: totalTime })
      .eq("id", id);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { message: "Failed to update history", error },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Update successful" });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { message: "Error processing request.", error: (error as Error).message },
      { status: 500 }
    );
  }
}
