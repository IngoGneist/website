"use client";

import { useState } from 'react';
import { Home, Zap, MapPin, Building, Users } from 'lucide-react';
import Stepper, { Step } from './Stepper';
import { useLocale } from '@/context/LocaleContext';

interface FlowData {
  haustyp: string;
  address: string;
  postleitzahl: string;
  lat: number;
  lng: number;
  roofAreas: RoofArea[];
  energieverbrauch: string;
  verbrauchstyp: 'kwh' | 'personen';
  personenAnzahl: string;
  dachform: string;
  dachaufbau: string;
  verschattung: string;
}

export interface RoofArea {
  squareMeters: number;
  orientation: string;
  pitch: number;
}

interface PhotovoltaikFlowProps {
  onClose: () => void;
  onComplete: (data: FlowData & { calculatedResults: any }) => void;
  initialAddressData?: {
    address: string;
    postleitzahl: string;
    lat: number;
    lng: number;
  };
}

const PhotovoltaikFlow = ({ onClose, onComplete, initialAddressData }: PhotovoltaikFlowProps) => {
  const { t } = useLocale();
  const [currentStep, setCurrentStep] = useState(initialAddressData ? 3 : 1);
  const [flowData, setFlowData] = useState<FlowData>({
    haustyp: '',
    address: initialAddressData?.address || '',
    postleitzahl: initialAddressData?.postleitzahl || '',
    lat: initialAddressData?.lat || 0,
    lng: initialAddressData?.lng || 0,
    roofAreas: [],
    energieverbrauch: '',
    verbrauchstyp: 'kwh',
    personenAnzahl: '',
    dachform: '',
    dachaufbau: '',
    verschattung: ''
  });

  const calculateResults = (data: FlowData) => {
    // Calculate total roof area
    const totalDachflaeche = data.roofAreas.reduce((sum, area) => sum + area.squareMeters, 0);
    
    // Parse energy consumption from range buttons or direct input
    let verbrauchNum: number;
    if (data.verbrauchstyp === 'personen') {
      let personen = 1;
      if (data.personenAnzahl.includes('2')) personen = 2;
      else if (data.personenAnzahl.includes('3')) personen = 3;
      else if (data.personenAnzahl.includes('4')) personen = 4;
      else if (data.personenAnzahl.includes('5+')) personen = 5;
      verbrauchNum = 1800 + (personen - 1) * 700; // 1800 kWh for first person, +700 for each additional
    } else {
      // Parse consumption from range buttons or direct input
      if (data.energieverbrauch.includes('Bis 2.500')) {
        verbrauchNum = 2000;
      } else if (data.energieverbrauch.includes('2.500-4.000')) {
        verbrauchNum = 3250;
      } else if (data.energieverbrauch.includes('4.000-6.000')) {
        verbrauchNum = 5000;
      } else if (data.energieverbrauch.includes('Über 6.000')) {
        verbrauchNum = 7000;
      } else {
        // Try to extract number from string
        const match = data.energieverbrauch.match(/(\d+)/);
        verbrauchNum = match ? parseInt(match[1]) : 3500;
      }
    }
    
    // Calculate weighted efficiency based on orientations and pitch
    let totalWeightedArea = 0;
    data.roofAreas.forEach(area => {
      let orientationFactor = 1.0;
      if (area.orientation === 'Süd') orientationFactor = 1.0;
      else if (area.orientation === 'Ost/West') orientationFactor = 0.85;
      else if (area.orientation === 'Nord') orientationFactor = 0.6;
      
      // Pitch factor (optimal around 30-35 degrees)
      let pitchFactor = 1.0;
      if (area.pitch < 15) pitchFactor = 0.95;
      else if (area.pitch > 45) pitchFactor = 0.9;
      
      totalWeightedArea += area.squareMeters * orientationFactor * pitchFactor;
    });
    
    // Calculate system size based on roof type
    const isFlachdach = data.dachform === 'Flachdach';
    const kwpPerM2 = isFlachdach ? 0.2 : 0.225;
    const maxSystemFromRoof = totalWeightedArea * kwpPerM2;
    const maxSystemFromConsumption = verbrauchNum * 1.2; // Allow 20% oversizing
    
    const anlagenGroesse = Math.min(maxSystemFromRoof, maxSystemFromConsumption);
    
    // Improved yield calculation based on location (simplified)
    let specificYield = 950; // kWh/kWp default for Germany
    if (data.postleitzahl) {
      const plz = parseInt(data.postleitzahl);
      if (plz >= 70000 && plz < 90000) specificYield = 1000; // South Germany
      else if (plz >= 20000 && plz < 30000) specificYield = 900; // North Germany
    }
    
    const jahresertrag = anlagenGroesse * specificYield;
    
    // Calculate EEG revenue (simplified)
    const eegErloes = anlagenGroesse * 0.082; // Simplified EEG rate
    
    // Calculate costs (simplified model)
    const kostenGeschaetzt = anlagenGroesse * 1200; // Euro pro kWp
    
    // Calculate savings (EEG revenue + self-consumption benefits)
    const selfConsumptionRate = 0.3; // 30% self-consumption
    const electricityPrice = 0.35; // 35 cents per kWh
    const selfConsumptionSavings = jahresertrag * selfConsumptionRate * electricityPrice;
    const einsparungJahr = eegErloes + selfConsumptionSavings;
    
    const amortisationszeit = kostenGeschaetzt > 0 ? Math.round(kostenGeschaetzt / einsparungJahr) : 0;

    return {
      anlagenGroesse: Math.round(anlagenGroesse * 100) / 100, // Round to 2 decimals
      jahresertrag: Math.round(jahresertrag),
      kostenGeschaetzt: Math.round(kostenGeschaetzt),
      einsparungJahr: Math.round(einsparungJahr),
      eegErloes: Math.round(eegErloes),
      amortisationszeit,
      totalDachflaeche,
      verbrauchNum,
      kwpPerM2
    };
  };

  const updateFlowData = (key: keyof FlowData, value: string | RoofArea[]) => {
    setFlowData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const handleFinalStepCompleted = () => {
    const calculatedResults = calculateResults(flowData);
    onComplete({ ...flowData, calculatedResults });
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: return flowData.haustyp !== '';
      case 2: return flowData.address !== '' && flowData.postleitzahl !== '';
      case 3: return flowData.roofAreas.length > 0 && flowData.roofAreas.every(area => area.squareMeters > 0 && area.orientation !== '');
      case 4: 
        if (flowData.verbrauchstyp === 'kwh') {
          return flowData.energieverbrauch !== '';
        } else {
          return flowData.personenAnzahl !== '';
        }
      case 5: return flowData.dachform !== '';
      case 6: return flowData.dachaufbau !== '';
      default: return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-2 md:p-4">
      <div className="w-full max-w-2xl bg-[#022c22] border border-white/10 rounded-2xl shadow-2xl relative overflow-y-auto max-h-[95vh] scrollbar-hide">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl z-10"
        >
          ✕
        </button>
        <div className="p-5 md:p-8">
          <div className="flex items-center gap-4 mb-6 md:mb-8">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">{t("components.photovoltaikFlow.title")}</h2>
            </div>
          </div>
          <Stepper
            initialStep={initialAddressData ? 3 : 1}
            onStepChange={handleStepChange}
            onFinalStepCompleted={handleFinalStepCompleted}
            backButtonText={t("components.photovoltaikFlow.back")}
            nextButtonText={t("components.photovoltaikFlow.next")}
            stepCircleContainerClassName="bg-transparent border-none"
            isStepValid={isStepValid}
            nextButtonProps={{
              onClick: (e) => {
                if (!isStepValid(currentStep)) {
                  e.preventDefault();
                }
              },
              className: "bg-primary text-black hover:bg-primary/90 rounded-full px-8"
            }}
            backButtonProps={{
                className: "bg-white/5 text-white hover:bg-white/10 border border-white/10 rounded-full px-8"
            }}
          >
            <Step>
              <div className="space-y-4 md:space-y-6 py-2 md:py-4">
                <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center">
                  <Home className="inline mr-3 text-primary shrink-0" size={24} />
                  <span className="leading-tight">{t("components.photovoltaikFlow.step1Title")}</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                  {[
                    { v: 'Einfamilienhaus', k: 'houseTypeSingle' },
                    { v: 'Doppelhaushälfte', k: 'houseTypeSemi' },
                    { v: 'Reihenhaus', k: 'houseTypeTerraced' },
                    { v: 'Mehrfamilienhaus', k: 'houseTypeMulti' },
                    { v: 'Halle', k: 'houseTypeHall' }
                  ].map(({ v, k }) => (
                    <button
                      key={v}
                      onClick={() => updateFlowData('haustyp', v)}
                      className={`h-auto p-3 md:p-4 text-sm md:text-base text-left rounded-xl border transition-all ${
                        flowData.haustyp === v
                          ? 'bg-primary text-black border-primary'
                          : 'bg-white/5 text-white border-white/10 hover:border-primary/50 hover:bg-white/10'
                      }`}
                    >
                      {t("components.photovoltaikFlow." + k)}
                    </button>
                  ))}
                </div>
              </div>
            </Step>

            <Step>
              <div className="space-y-6 py-4">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <MapPin className="inline mr-3 text-primary" size={24} />
                  {t("components.photovoltaikFlow.step2Title")}
                </h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t("components.photovoltaikFlow.addressPlaceholder")}
                    value={flowData.address}
                    onChange={(e) => updateFlowData('address', e.target.value)}
                    className="w-full p-4 border border-white/10 rounded-xl bg-white/5 text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder={t("components.photovoltaikFlow.postcodePlaceholder")}
                    value={flowData.postleitzahl}
                    onChange={(e) => updateFlowData('postleitzahl', e.target.value)}
                    className="w-full p-4 border border-white/10 rounded-xl bg-white/5 text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </Step>

            <Step>
              <div className="space-y-6 py-4">
                <h3 className="text-xl font-semibold text-white mb-4">
                  {t("components.photovoltaikFlow.step3Title")}
                </h3>
                <div className="space-y-4">
                  {flowData.roofAreas.length === 0 ? (
                    <button
                      onClick={() => {
                        setFlowData(prev => ({
                          ...prev,
                          roofAreas: [...prev.roofAreas, { squareMeters: 0, orientation: '', pitch: 30 }]
                        }));
                      }}
                      className="w-full p-4 border-2 border-dashed border-white/20 rounded-xl hover:border-primary text-white/60 hover:text-primary transition-colors"
                    >
                      {t("components.photovoltaikFlow.addRoofArea")}
                    </button>
                  ) : (
                    flowData.roofAreas.map((area, index) => (
                      <div key={index} className="p-6 border border-white/10 bg-white/5 rounded-xl space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            {t("components.photovoltaikFlow.areaM2")}
                          </label>
                          <input
                            type="number"
                            value={area.squareMeters}
                            onFocus={(e) => {
                              if (e.target.value === '0') {
                                e.target.value = '';
                              }
                            }}
                            onChange={(e) => {
                              const newAreas = [...flowData.roofAreas];
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              newAreas[index].squareMeters = value;
                              updateFlowData('roofAreas', newAreas);
                            }}
                            className="w-full p-3 border border-white/10 rounded-lg bg-black/20 text-white focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            {t("components.photovoltaikFlow.orientation")}
                          </label>
                          <select
                            value={area.orientation}
                            onChange={(e) => {
                              const newAreas = [...flowData.roofAreas];
                              newAreas[index].orientation = e.target.value;
                              updateFlowData('roofAreas', newAreas);
                            }}
                            className="w-full p-3 border border-white/10 rounded-lg bg-black/20 text-white focus:border-primary focus:outline-none"
                          >
                            <option value="" className="bg-gray-900">{t("components.photovoltaikFlow.pleaseSelect")}</option>
                            <option value="Süd" className="bg-gray-900">{t("components.photovoltaikFlow.south")}</option>
                            <option value="Ost/West" className="bg-gray-900">{t("components.photovoltaikFlow.eastWest")}</option>
                            <option value="Nord" className="bg-gray-900">{t("components.photovoltaikFlow.north")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            {t("components.photovoltaikFlow.pitchDegrees")}
                          </label>
                          <input
                            type="number"
                            value={area.pitch}
                            onFocus={(e) => {
                              if (e.target.value === '0') {
                                e.target.value = '';
                              }
                            }}
                            onChange={(e) => {
                              const newAreas = [...flowData.roofAreas];
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              newAreas[index].pitch = value;
                              updateFlowData('roofAreas', newAreas);
                            }}
                            className="w-full p-3 border border-white/10 rounded-lg bg-black/20 text-white focus:border-primary focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newAreas = flowData.roofAreas.filter((_, i) => i !== index);
                            updateFlowData('roofAreas', newAreas);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          {t("components.photovoltaikFlow.remove")}
                        </button>
                      </div>
                    ))
                  )}
                  {flowData.roofAreas.length > 0 && (
                    <button
                      onClick={() => {
                        setFlowData(prev => ({
                          ...prev,
                          roofAreas: [...prev.roofAreas, { squareMeters: 0, orientation: '', pitch: 30 }]
                        }));
                      }}
                      className="w-full p-4 border border-dashed border-white/20 rounded-xl hover:border-primary text-white/60 hover:text-primary transition-colors text-sm"
                    >
                      {t("components.photovoltaikFlow.addAnotherRoof")}
                    </button>
                  )}
                </div>
              </div>
            </Step>

            <Step>
              <div className="space-y-4 md:space-y-6 py-2 md:py-4">
                <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center">
                  <Zap className="inline mr-3 text-primary shrink-0" size={24} />
                  <span className="leading-tight">{t("components.photovoltaikFlow.step4Title")}</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
                  <button
                    onClick={() => updateFlowData('verbrauchstyp', 'kwh')}
                    className={`h-auto p-3 md:p-4 text-sm md:text-base rounded-xl border transition-all ${
                      flowData.verbrauchstyp === 'kwh'
                        ? 'bg-primary text-black border-primary'
                        : 'bg-white/5 text-white border-white/10 hover:border-primary/50'
                    }`}
                  >
                    <Zap className="inline mr-2" size={18} />
                    kWh
                  </button>
                  <button
                    onClick={() => updateFlowData('verbrauchstyp', 'personen')}
                    className={`h-auto p-3 md:p-4 text-sm md:text-base rounded-xl border transition-all ${
                      flowData.verbrauchstyp === 'personen'
                        ? 'bg-primary text-black border-primary'
                        : 'bg-white/5 text-white border-white/10 hover:border-primary/50'
                    }`}
                  >
                    <Users className="inline mr-2" size={18} />
                    {t("components.photovoltaikFlow.persons")}
                  </button>
                </div>

                {flowData.verbrauchstyp === 'kwh' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      {[
                        { v: 'Bis 2.500 kWh', k: 'consumptionUpTo2500' },
                        { v: '2.500-4.000 kWh', k: 'consumption2500to4000' },
                        { v: '4.000-6.000 kWh', k: 'consumption4000to6000' },
                        { v: 'Über 6.000 kWh', k: 'consumptionOver6000' }
                      ].map(({ v, k }) => (
                        <button
                          key={v}
                          onClick={() => updateFlowData('energieverbrauch', v)}
                          className={`h-auto p-3 md:p-4 text-sm md:text-base text-left rounded-xl border transition-all ${
                            flowData.energieverbrauch === v
                              ? 'bg-primary text-black border-primary'
                              : 'bg-white/5 text-white border-white/10 hover:border-primary/50'
                          }`}
                        >
                          {t("components.photovoltaikFlow." + k)}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3 mt-4">
                      <span className="text-xs md:text-sm text-white/70">{t("components.photovoltaikFlow.orExact")}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="z.B. 3500"
                          className="w-24 md:w-32 p-2 border border-white/10 rounded-lg bg-black/20 text-white focus:border-primary focus:outline-none text-sm"
                          onFocus={(e) => {
                            if (e.target.value === '0') {
                              e.target.value = '';
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : e.target.value + ' kWh';
                            updateFlowData('energieverbrauch', value);
                          }}
                        />
                        <span className="text-xs md:text-sm text-white/70">{t("components.photovoltaikFlow.kwhPerYear")}</span>
                      </div>
                    </div>
                  </div>
                )}

                {flowData.verbrauchstyp === 'personen' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      {[
                        { v: '1 Person', k: 'person1' },
                        { v: '2 Personen', k: 'person2' },
                        { v: '3 Personen', k: 'person3' },
                        { v: '4 Personen', k: 'person4' },
                        { v: '5+ Personen', k: 'person5plus' }
                      ].map(({ v, k }) => (
                        <button
                          key={v}
                          onClick={() => updateFlowData('personenAnzahl', v)}
                          className={`h-auto p-3 md:p-4 text-sm md:text-base text-left rounded-xl border transition-all ${
                            flowData.personenAnzahl === v
                              ? 'bg-primary text-black border-primary'
                              : 'bg-white/5 text-white border-white/10 hover:border-primary/50'
                          }`}
                        >
                          {t("components.photovoltaikFlow." + k)}
                        </button>
                      ))}
                    </div>
                    {flowData.personenAnzahl && (
                      <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                        <p className="text-xs md:text-sm text-primary">
                          {t("components.photovoltaikFlow.estimatedConsumption")} <strong>
                            {(() => {
                              let personen = 1;
                              if (flowData.personenAnzahl.includes('2')) personen = 2;
                              else if (flowData.personenAnzahl.includes('3')) personen = 3;
                              else if (flowData.personenAnzahl.includes('4')) personen = 4;
                              else if (flowData.personenAnzahl.includes('5+')) personen = 5;
                              return 1800 + (personen - 1) * 700;
                            })()} kWh/Jahr
                          </strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Step>

            <Step>
              <div className="space-y-4 md:space-y-6 py-2 md:py-4">
                <h3 className="text-lg md:text-xl font-semibold text-white mb-4">
                  {t("components.photovoltaikFlow.step5Title")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                  {[
                    { v: 'Schrägdach', k: 'roofPitched' },
                    { v: 'Flachdach', k: 'roofFlat' }
                  ].map(({ v, k }) => (
                    <button
                      key={v}
                      onClick={() => updateFlowData('dachform', v)}
                      className={`h-auto p-3 md:p-4 text-sm md:text-base text-left rounded-xl border transition-all ${
                        flowData.dachform === v
                          ? 'bg-primary text-black border-primary'
                          : 'bg-white/5 text-white border-white/10 hover:border-primary/50'
                      }`}
                    >
                      {t("components.photovoltaikFlow." + k)}
                    </button>
                  ))}
                </div>
              </div>
            </Step>

            <Step>
              <div className="space-y-4 md:space-y-6 py-2 md:py-4">
                <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center">
                  <Building className="inline mr-3 text-primary shrink-0" size={24} />
                  {t("components.photovoltaikFlow.step6Title")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                  {[
                    { v: 'Ziegel/Dachsteine', k: 'roofStructureTiles' },
                    { v: 'Blechdach', k: 'roofStructureMetal' },
                    { v: 'Bitumen/Flachdach', k: 'roofStructureBitumen' },
                    { v: 'Sonstiges', k: 'roofStructureOther' }
                  ].map(({ v, k }) => (
                    <button
                      key={v}
                      onClick={() => updateFlowData('dachaufbau', v)}
                      className={`h-auto p-3 md:p-4 text-sm md:text-base text-left rounded-xl border transition-all ${
                        flowData.dachaufbau === v
                          ? 'bg-primary text-black border-primary'
                          : 'bg-white/5 text-white border-white/10 hover:border-primary/50'
                      }`}
                    >
                      {t("components.photovoltaikFlow." + k)}
                    </button>
                  ))}
                </div>
              </div>
            </Step>
          </Stepper>
        </div>
      </div>
    </div>
  );
};

export default PhotovoltaikFlow;
