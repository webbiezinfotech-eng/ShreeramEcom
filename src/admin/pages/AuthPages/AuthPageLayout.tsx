import React from "react";
import { Link } from "react-router";
import srlogo from "../../../assets/srlogo.png";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative bg-white dark:bg-gray-900 min-h-screen">
      <div className="relative flex flex-col w-full min-h-screen lg:flex-row dark:bg-gray-900">
        {children}
        <div className="items-center justify-center hidden w-full lg:w-1/2 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 lg:flex relative overflow-hidden min-h-screen">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>
          <div className="relative flex flex-col items-center justify-center z-10 px-8 lg:px-12 xl:px-16 py-16 xl:py-20 w-full">
            <div className="mb-10 xl:mb-14">
              <Link to="/" className="block p-6 xl:p-8 bg-white/10 dark:bg-white/5 rounded-3xl backdrop-blur-md border border-white/20 dark:border-white/10 shadow-2xl hover:bg-white/15 transition-all duration-300">
                <img
                  src={srlogo}
                  alt="Shreeram Stationery"
                  className="h-20 xl:h-28 w-auto max-w-md object-contain"
                />
              </Link>
            </div>
            <h2 className="text-3xl xl:text-5xl font-bold text-white text-center mb-5 xl:mb-6 leading-tight">
              Welcome to Admin Panel
            </h2>
            <p className="text-center text-blue-100 dark:text-gray-300 text-lg xl:text-xl max-w-lg xl:max-w-xl leading-relaxed">
              Professional Stationery Solutions Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
