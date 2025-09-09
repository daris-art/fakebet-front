import React from "react";

const LeagueCard = ({ league, isSelected, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(league.id)}
      className={`w-60 sm:w-64 md:w-72 lg:w-80 cursor-pointer bg-[#121212] text-white rounded-xl p-5 mb-4 border-2 transition-all duration-200
        ${isSelected
          ? "border-red-600 shadow-[0_0_10px_rgba(255,0,0,0.4)]"
          : "border-gray-700 hover:border-red-500 hover:shadow-[0_0_10px_rgba(255,0,0,0.3)]"}
      `}
    >
      <h3 className="text-xl font-bold text-red-500 mb-1 tracking-wide uppercase">
        {league.name}
      </h3>
      <p className="text-sm text-gray-400">
        🌍 {league.country} &nbsp;|&nbsp; 🏆 {league.type}
      </p>
    </div>
  );
};

export default LeagueCard;

