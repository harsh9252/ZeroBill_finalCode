import '../assets/css/ToggleSwitch.css';

export default function ToggleSwitch({ isOn = false, onChange, disabled = false }) {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={isOn || false}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle-slider">
        <span className="toggle-text toggle-on-text" style={{ visibility: isOn ? 'visible' : 'hidden' }}>ON</span>
        <span className="toggle-text toggle-off-text" style={{ visibility: !isOn ? 'visible' : 'hidden' }}>OFF</span>
        <span className="toggle-knob"></span>
      </span>
    </label>
  );
}
