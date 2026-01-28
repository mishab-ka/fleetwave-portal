import React, { useState, useRef, useEffect } from "react";
import { Search, User, Car, Phone, Badge as BadgeIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDriverSearch, Driver } from "@/hooks/useDriverSearch";

interface DriverSearchBarProps {
  onSelectDriver: (driver: Driver) => void;
  placeholder?: string;
  className?: string;
  selectedDriverId?: string;
}

export const DriverSearchBar: React.FC<DriverSearchBarProps> = ({
  onSelectDriver,
  placeholder = "Search driver by name, vehicle, or phone...",
  className,
  selectedDriverId,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { drivers, loading, searchDrivers, getDriverById, clearDrivers } =
    useDriverSearch();

  // Load selected driver if provided
  useEffect(() => {
    if (selectedDriverId && !selectedDriver) {
      getDriverById(selectedDriverId).then((driver) => {
        if (driver) {
          setSelectedDriver(driver);
          setSearchQuery(driver.name);
        }
      });
    }
  }, [selectedDriverId]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim().length >= 2 && !selectedDriver) {
      searchDrivers(searchQuery);
      setShowDropdown(true);
    } else if (searchQuery.trim().length < 2) {
      clearDrivers();
      setShowDropdown(false);
    }
  }, [searchQuery, selectedDriver]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setSearchQuery(driver.name);
    setShowDropdown(false);
    onSelectDriver(driver);
  };

  const handleClearSelection = () => {
    setSelectedDriver(null);
    setSearchQuery("");
    clearDrivers();
    inputRef.current?.focus();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (drivers.length > 0) setShowDropdown(true);
          }}
          className="pl-10 pr-10"
        />
        {selectedDriver && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {/* Selected Driver Preview */}
      {selectedDriver && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {getInitials(selectedDriver.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate">
                  {selectedDriver.name}
                </p>
                <Badge
                  variant={selectedDriver.online ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    selectedDriver.online
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  )}
                >
                  {selectedDriver.online ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                {selectedDriver.vehicle_number && (
                  <div className="flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    <span>{selectedDriver.vehicle_number}</span>
                  </div>
                )}
                {selectedDriver.phone_number && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{selectedDriver.phone_number}</span>
                  </div>
                )}
                {selectedDriver.adjustment_count !== undefined &&
                  selectedDriver.adjustment_count > 0 && (
                    <div className="flex items-center gap-1">
                      <BadgeIcon className="h-3 w-3" />
                      <span>{selectedDriver.adjustment_count} adjustments</span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Results */}
      {showDropdown && !selectedDriver && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm mt-2">Searching...</p>
            </div>
          )}

          {!loading && drivers.length === 0 && searchQuery.length >= 2 && (
            <div className="p-4 text-center text-gray-500">
              <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No drivers found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}

          {!loading && drivers.length > 0 && (
            <div className="py-1">
              {drivers.map((driver) => (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => handleSelectDriver(driver)}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold flex-shrink-0">
                      {getInitials(driver.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {driver.name}
                        </p>
                        <Badge
                          variant={driver.online ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            driver.online
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          )}
                        >
                          {driver.online ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        {driver.vehicle_number && (
                          <div className="flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            <span>{driver.vehicle_number}</span>
                          </div>
                        )}
                        {driver.phone_number && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{driver.phone_number}</span>
                          </div>
                        )}
                        {driver.shift && (
                          <span className="text-xs text-gray-500">
                            {driver.shift}
                          </span>
                        )}
                      </div>
                      {driver.adjustment_count !== undefined &&
                        driver.adjustment_count > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-purple-600">
                            <BadgeIcon className="h-3 w-3" />
                            <span>{driver.adjustment_count} adjustments</span>
                          </div>
                        )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
