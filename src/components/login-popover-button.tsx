import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import Button from "./common/custom-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import DiscordIcon from "@/icons/discord";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";

type FormData = {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
};

function LoginPopoverButton() {
  const auth = useAuthStore();
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [tabValue, setTabValue] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  const loadProfile = async (userId: string, email = "") => {
    const supabase = getSupabaseBrowserClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, auto_skip, created_at")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      throw error || new Error("Profile not found");
    }

    auth.setAuth({
      id: profile.id,
      email,
      username: profile.username,
      avatar: profile.avatar_url || "",
      collectionId: "",
      collectionName: "profiles",
      autoSkip: !!profile.auto_skip,
      created: profile.created_at,
    });
  };

  const loginWithEmail = async () => {
    if (!formData.username.trim() || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const email = formData.username.trim();
      if (!email.includes("@")) {
        throw new Error("Введите email, использованный при регистрации.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
      });
      if (error || !data.user) throw error || new Error("Login failed");

      await loadProfile(data.user.id, data.user.email || email);
      toast.success("Login successful");
      clearForm();
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error instanceof Error ? error.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async () => {
    if (!formData.username.trim() || !formData.password || !formData.email.trim() || !formData.confirm_password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: { username: formData.username.trim() },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      if (data.session && data.user) {
        await loadProfile(data.user.id, data.user.email || formData.email);
        toast.success("Account created successfully");
      } else {
        toast.success("Account created. Check your email to confirm registration.");
        setTabValue("login");
      }
      clearForm();
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error instanceof Error ? error.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({ username: "", email: "", password: "", confirm_password: "" });
  };

  const loginWithDiscord = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Discord login error:", error);
      toast.error(error instanceof Error ? error.message : "Discord login is unavailable");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="bg-white text-md text-black hover:bg-gray-200 hover:text-black transition-all duration-300"
        >
          Login
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        className="bg-black bg-opacity-50 backdrop-blur-sm w-[300px] mt-4 mr-4 p-4"
      >
        <Tabs
          defaultValue={tabValue}
          value={tabValue}
          onValueChange={(value) => setTabValue(value as "login" | "signup")}
        >
          <TabsList>
            <TabsTrigger onClick={clearForm} value="login">Login</TabsTrigger>
            <TabsTrigger onClick={clearForm} value="signup">Signup</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="flex flex-col gap-2">
            <div className="mt-2">
              <p className="text-gray-300 text-xs">Email:</p>
              <Input required onChange={(e) => setFormData({ ...formData, username: e.target.value })} type="text" value={formData.username} placeholder="Enter your email" />
            </div>
            <div>
              <p className="text-gray-300 text-xs">Password:</p>
              <Input required type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Enter your password" />
            </div>
            <Button variant="default" className="w-full text-xs" size="sm" type="submit" loading={loading} disabled={loading} onClick={loginWithEmail}>Login</Button>
            <hr className="text-white text-xs text-center" />
            <Button variant="default" className="bg-blue-600 hover:bg-blue-800 text-white w-full text-xs" size="sm" disabled={loading} onClick={loginWithDiscord}>
              <DiscordIcon className="mr-2" />Login with Discord
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="flex flex-col gap-2">
            <div>
              <p className="text-gray-300 text-xs">Username:</p>
              <Input required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} type="text" placeholder="Enter your username" />
            </div>
            <div>
              <p className="text-gray-300 text-xs">Email:</p>
              <Input required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} type="email" placeholder="Enter your email" />
            </div>
            <div>
              <p className="text-gray-300 text-xs">Password:</p>
              <Input required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} type="password" placeholder="Enter your password" />
            </div>
            <div>
              <p className="text-gray-300 text-xs">Confirm Password:</p>
              <Input required value={formData.confirm_password} onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })} type="password" placeholder="Enter your password again" />
            </div>
            <Button variant="default" className="w-full text-xs" size="sm" type="submit" loading={loading} disabled={loading} onClick={signupWithEmail}>Signup</Button>
            <hr className="text-white text-xs text-center" />
            <Button variant="default" className="bg-blue-600 hover:bg-blue-800 text-white w-full text-xs" size="sm" disabled={loading} onClick={loginWithDiscord}>
              <DiscordIcon className="mr-2" />Signup with Discord
            </Button>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

export default LoginPopoverButton;
