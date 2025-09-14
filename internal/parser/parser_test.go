package parser

import (
	"testing"

	"DDSUViewer/internal/registers"
)

func TestFilterElectricalData_Nil(t *testing.T) {
	p := NewDataParser()
	if got := p.FilterElectricalData(nil); got != nil {
		t.Fatalf("expected nil for nil input, got %#v", got)
	}
}

func TestFilterElectricalData_ClampBelowThreshold(t *testing.T) {
	p := NewDataParser()
	in := &registers.ElectricalData{
		Voltage:       -2000.0,
		Current:       -2000.0,
		ActivePower:   -2000.0,
		ReactivePower: -2000.0,
		ApparentPower: -2000.0,
		PowerFactor:   -2000.0,
		Frequency:     -2000.0,
		ActiveEnergy:  -2000.0,
	}
	out := p.FilterElectricalData(in)

	if out == nil {
		t.Fatalf("expected non-nil output")
	}
	if out.Voltage != 0 || out.Current != 0 || out.ActivePower != 0 || out.ReactivePower != 0 ||
		out.ApparentPower != 0 || out.PowerFactor != 0 || out.Frequency != 0 || out.ActiveEnergy != 0 {
		t.Fatalf("expected all fields clamped to 0, got %#v", out)
	}
}

func TestFilterElectricalData_PassThrough(t *testing.T) {
	p := NewDataParser()
	in := &registers.ElectricalData{
		Voltage:       220.5,
		Current:       1.23,
		ActivePower:   270.0,
		ReactivePower: -50.0,
		ApparentPower: 280.0,
		PowerFactor:   0.97,
		Frequency:     50.0,
		ActiveEnergy:  123.456,
	}
	out := p.FilterElectricalData(in)

	if out == nil {
		t.Fatalf("expected non-nil output")
	}
	if out.Voltage != in.Voltage || out.Current != in.Current || out.ActivePower != in.ActivePower ||
		out.ReactivePower != in.ReactivePower || out.ApparentPower != in.ApparentPower ||
		out.PowerFactor != in.PowerFactor || out.Frequency != in.Frequency || out.ActiveEnergy != in.ActiveEnergy {
		t.Fatalf("expected values to pass through unchanged, got %#v", out)
	}
}