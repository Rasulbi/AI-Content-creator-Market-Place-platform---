import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const certId = (id || "").trim();

    if (!certId || !certId.startsWith("CERT-")) {
      return NextResponse.json(
        { valid: false, error: "Invalid certificate identifier format." },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { valid: false, error: "Database service is not configured for certificate verification." },
        { status: 503 }
      );
    }

    const supabase = createAdminClient();

    let matched: any = null;

    // 1. Attempt fast direct lookup by certificate_id column (if column exists post-migration)
    const { data: directMatch, error: directErr } = await (supabase.from("test_submissions") as any)
      .select("id, test_id, creator_profile_id, score, status, feedback, answers, submitted_at, skill_tests(title), creator_profiles(name, slug)")
      .eq("status", "passed")
      .eq("certificate_id", certId)
      .maybeSingle();

    if (!directErr && directMatch) {
      matched = directMatch;
    } else {
      // 2. Fallback: Search passed submissions for certificate ID in column, answers JSON, or feedback
      const { data: submissions, error: listError } = await supabase
        .from("test_submissions")
        .select("id, test_id, creator_profile_id, score, status, feedback, answers, submitted_at, skill_tests(title), creator_profiles(name, slug)")
        .eq("status", "passed");

      if (listError) {
        return NextResponse.json(
          { valid: false, error: "Failed to verify certificate: " + listError.message },
          { status: 500 }
        );
      }

      matched = (submissions || []).find((sub: any) => {
        const storedCertId =
          (sub as any).certificate_id ||
          sub.answers?.__certificate?.certificateId ||
          sub.answers?.certificateId;
        const feedbackIncludes =
          typeof sub.feedback === "string" && sub.feedback.includes(certId);
        return storedCertId === certId || feedbackIncludes;
      });
    }

    if (!matched) {
      return NextResponse.json(
        {
          valid: false,
          error: "Certificate not found. The certificate identifier does not correspond to an authentic, passed assessment record.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      certificate: {
        certificateId: certId,
        creatorName: (matched.creator_profiles as any)?.name || "Verified Creator",
        creatorSlug: (matched.creator_profiles as any)?.slug || undefined,
        assessmentTitle: (matched.skill_tests as any)?.title || "Standardized AI Skill Benchmark",
        score: Number(matched.score) || 80,
        status: "passed",
        verifiedAt: matched.submitted_at,
        issuer: "Official AI Skill Benchmark Authority",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, error: err?.message || "Internal server error during certificate verification." },
      { status: 500 }
    );
  }
}
