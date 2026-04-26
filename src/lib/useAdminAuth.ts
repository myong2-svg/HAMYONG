"use client";

import { useEffect, useState } from "react";

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [storedPass, setStoredPass] = useState<string | null>(null);
  const [setupInput, setSetupInput] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupError, setSetupError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("isAdmin") === "true") setIsAdmin(true);
    fetch("/api/settings?key=admin_password")
      .then((r) => r.json())
      .then((d) => setStoredPass(d.value && d.value !== "0" ? d.value : ""));
  }, []);

  const openModal = () => {
    setShowModal(true);
    setPasswordInput("");
    setError("");
  };

  const closeModal = () => {
    setShowModal(false);
    setPasswordInput("");
    setError("");
    setSetupInput("");
    setSetupConfirm("");
    setSetupError("");
  };

  const verify = () => {
    if (passwordInput === storedPass) {
      setIsAdmin(true);
      sessionStorage.setItem("isAdmin", "true");
      closeModal();
    } else {
      setError("비밀번호가 틀렸습니다.");
    }
  };

  const setup = async () => {
    if (!setupInput) { setSetupError("비밀번호를 입력해주세요."); return; }
    if (setupInput !== setupConfirm) { setSetupError("비밀번호가 일치하지 않습니다."); return; }
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "admin_password", value: setupInput }),
    });
    setStoredPass(setupInput);
    setIsAdmin(true);
    sessionStorage.setItem("isAdmin", "true");
    closeModal();
  };

  const logout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem("isAdmin");
  };

  return {
    isAdmin, showModal, passwordInput, setPasswordInput,
    error, storedPass, setupInput, setSetupInput,
    setupConfirm, setSetupConfirm, setupError,
    openModal, closeModal, verify, setup, logout,
  };
}
