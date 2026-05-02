import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

function OtpVerification() {
  const navigate = useNavigate();
  const API_VERIFY = "http://localhost:4002/api/register/verifyCodeEmail";
  const API_REGISTER = "http://localhost:4002/api/register";
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (otpCode.length !== 6) {
      toast.error("Ingresa el código OTP de 6 caracteres");
      return;
    }
    // Acepta letras y números (códigos hexadecimales como db96fe)
    if (!/^[a-f0-9]{6}$/.test(otpCode)) {
      toast.error("El código OTP solo puede contener letras (a-f) y números");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(API_VERIFY, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ verificationCodeRequest: otpCode }),
      });

      const payload = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(payload?.message || "No se pudo verificar el código");
      }

      sessionStorage.removeItem("pendingRegistration");
      toast.success(payload?.message || "Cuenta verificada correctamente");
      navigate("/");
    } catch (error) {
      toast.error(error.message || "Error verificando código OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    const rawPending = sessionStorage.getItem("pendingRegistration");
    if (!rawPending) {
      toast.error("No hay datos de registro para reenviar el código");
      return;
    }

    setIsResending(true);

    try {
      const payload = JSON.parse(rawPending);
      const response = await fetch(API_REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "No se pudo reenviar el código");
      }

      toast.success(result?.message || "Código reenviado");
    } catch (error) {
      toast.error(error.message || "No se pudo reenviar el código");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#1F1F1F] text-white">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 20% 18%, rgba(130,39,39,0.35), transparent 38%)" }} />

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <aside className="hidden lg:flex items-center p-12 lg:p-16">
          <div className="max-w-xl">
            <span className="mb-6 inline-block h-1 w-10 rounded-full bg-[#822727]" />
            <h1 className="text-5xl font-bold uppercase tracking-[0.28em] text-white">Autorect</h1>
            <p className="mt-6 text-2xl leading-7 text-white/50">
              Ingresa el código OTP enviado a tu correo para completar el registro.
            </p>
          </div>
        </aside>

        <article className="flex items-center justify-center p-6 sm:p-10 lg:p-16">
          <Card className="w-full max-w-lg rounded-3xl border-white/10 bg-black/30 p-2 text-white ring-white/5">
            <CardHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <CardTitle className="text-3xl font-semibold text-white">Código OTP<span className="text-[#822727]">.</span></CardTitle>
              <CardDescription className="mt-2 text-sm text-white/40">Revisa tu correo e ingresa los 6 dígitos.</CardDescription>
            </CardHeader>

            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <form className="mt-3 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-white/50">Código de verificación</Label>
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} containerClassName="justify-center">
                    <InputOTPGroup className="rounded-xl border border-white/10 bg-white/4">
                      <InputOTPSlot index={0} className="h-11 w-11 border-white/10 text-white" />
                      <InputOTPSlot index={1} className="h-11 w-11 border-white/10 text-white" />
                      <InputOTPSlot index={2} className="h-11 w-11 border-white/10 text-white" />
                      <InputOTPSlot index={3} className="h-11 w-11 border-white/10 text-white" />
                      <InputOTPSlot index={4} className="h-11 w-11 border-white/10 text-white" />
                      <InputOTPSlot index={5} className="h-11 w-11 border-white/10 text-white" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl border-[#822727] bg-transparent text-sm font-semibold text-white hover:bg-[#822727]/15 hover:text-white"
                >
                  {isSubmitting ? "Verificando..." : "Verificar y continuar"}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm text-white/40">
                <Link to="/register" className={buttonVariants({ variant: "link", size: "sm" }) + " h-auto p-0 text-white hover:text-[#822727]"}>
                  Volver a registro
                </Link>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className={buttonVariants({ variant: "link", size: "sm" }) + " h-auto p-0 text-white hover:text-[#822727]"}
                >
                  {isResending ? "Reenviando..." : "Reenviar código"}
                </button>
              </div>
            </CardContent>
          </Card>
        </article>
      </div>
    </section>
  );
}

export default OtpVerification;