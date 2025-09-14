package registers

import (
	"math"
	"testing"
)

func float32AlmostEqual(a, b float32, eps float32) bool {
	diff := a - b
	if diff < 0 {
		diff = -diff
	}
	return diff <= eps
}

func TestParseFloat32(t *testing.T) {
	// 43 5C 80 00 => 220.5 (big-endian)
	data := []byte{0x43, 0x5C, 0x80, 0x00}
	got := ParseFloat32(data)
	want := float32(220.5)

	if !float32AlmostEqual(got, want, 0.001) {
		t.Fatalf("ParseFloat32: got %v want %v", got, want)
	}
}

func TestParseElectricalDataPartial(t *testing.T) {
	// Only provide voltage bytes
	regData := make(map[uint16][]byte)
	regData[RegVoltage] = []byte{0x43, 0x5C, 0x80, 0x00} // 220.5

	ed := ParseElectricalData(regData)
	if ed == nil {
		t.Fatalf("ParseElectricalData returned nil")
	}
	if !float32AlmostEqual(ed.Voltage, 220.5, 0.001) {
		t.Fatalf("Voltage: got %v want %v", ed.Voltage, 220.5)
	}
	// Other fields should be zero-valued
	if ed.Current != 0 || ed.ActivePower != 0 {
		t.Fatalf("Expected other fields to be zero, got Current=%v ActivePower=%v", ed.Current, ed.ActivePower)
	}
}

func TestIsValidFloat32(t *testing.T) {
	if !IsValidFloat32(1.23) {
		t.Fatalf("expected valid float")
	}
	if IsValidFloat32(float32(math.NaN())) {
		t.Fatalf("expected NaN to be invalid")
	}
	if IsValidFloat32(float32(math.Inf(1))) {
		t.Fatalf("expected +Inf to be invalid")
	}
}