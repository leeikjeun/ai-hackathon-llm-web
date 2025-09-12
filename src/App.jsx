import React, { useState } from "react";

// 고객 이름을 입력 받아 POST http://localhost:8000/run 호출 후
// 응답 JSON을 섹션별로 렌더링하는 간단한 화면

export default function App() {
  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState([]);
  const [llmModel, setLlmModel] = useState("ollama");
  const [useCache, setUseCache] = useState(true);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [error, setError] = useState("");

  // 고객 리스트 조회
  async function fetchCustomers() {
    setCustomersLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8000/customers", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${t}`);
      }
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCustomersLoading(false);
    }
  }

  // 분석 실행
  async function run() {
    if (!customerName.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("http://localhost:8000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: customerName, llm_model: llmModel, use_cache: useCache }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${t}`);
      }
      const data = await res.json();
      setResult(data.result || data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setCustomerName("");
    setLlmModel("ollama");
    setUseCache(true);
    setResult(null);
    setError("");
  }

  // 컴포넌트 마운트 시 고객 리스트 조회
  React.useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">의심거래 분석 뷰</h1>
          <p className="text-gray-600 mt-1">고객명을 입력해 분석 결과를 조회합니다.</p>
        </header>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">고객명</label>
              <select
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={customersLoading}
              >
                <option value="">고객을 선택하세요</option>
                {customers.map((customer, index) => (
                  <option key={index} value={customer}>
                    {customer}
                  </option>
                ))}
              </select>
              {customersLoading && (
                <div className="text-xs text-gray-500 mt-1">고객 리스트 로딩 중...</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">LLM 모델</label>
              <select
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
              >
                <option value="ollama">ollama</option>
                <option value="gpt5">gpt5</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">캐시 사용</label>
              <select
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring"
                value={useCache}
                onChange={(e) => setUseCache(e.target.value === "true")}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={run}
              disabled={loading || !customerName}
              className="px-4 py-2 rounded-xl bg-white text-black border disabled:opacity-60"
            >
              {loading ? "조회 중..." : "조회하기"}
            </button>
            <button onClick={resetAll} className="px-4 py-2 rounded-xl border text-black">초기화</button>
            <button
              onClick={fetchCustomers} 
              disabled={customersLoading}
              className="px-4 py-2 rounded-xl border text-black disabled:opacity-60"
            >
              {customersLoading ? "새로고침 중..." : "고객 리스트 새로고침"}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600">오류: {error}</div>
          )}

          {result && (
            <div className="mt-6 space-y-6">
              {/* 고객 기본 정보 */}
              <section>
                <h2 className="text-lg font-semibold mb-2">고객 정보</h2>
                {result.customer_raw ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(result.customer_raw).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">{k}</span>
                        <span className="font-medium break-all">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">고객 정보가 없습니다.</div>
                )}
              </section>

              {/* 거래 내역 */}
              <section>
                <h2 className="text-lg font-semibold mb-2">거래 내역</h2>
                {Array.isArray(result.tx_raw) && result.tx_raw.length > 0 ? (
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="min-w-full text-sm border">
                      <thead className="bg-gray-100">
                        <tr>
                          {[
                            "계좌번호",
                            "거래일시",
                            "입출금여부",
                            "금액",
                            "적요코드",
                            "상대은행",
                            "상대계좌",
                            "상대계좌명",
                            "통장표시내용",
                          ].map((h) => (
                            <th key={h} className={`px-2 py-2 border text-left whitespace-nowrap ${h === "계좌번호" ? "w-32" : ""}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.tx_raw.map((row, idx) => (
                          <tr key={idx} className="odd:bg-white even:bg-gray-50">
                            <td className="px-2 py-2 border w-32 whitespace-nowrap">{row["계좌번호"]}</td>
                            <td className="px-2 py-2 border whitespace-nowrap">{row["거래일시"]}</td>
                            <td className="px-2 py-2 border">{row["입출금여부"]}</td>
                            <td className="px-2 py-2 border text-right">{row["금액"]?.toLocaleString?.() ?? row["금액"]}</td>
                            <td className="px-2 py-2 border">{row["적요코드"]}</td>
                            <td className="px-2 py-2 border">{row["상대은행"] === "nan" ? "" : row["상대은행"]}</td>
                            <td className="px-2 py-2 border">{row["상대계좌"] === "nan" ? "" : row["상대계좌"]}</td>
                            <td className="px-2 py-2 border">{row["상대계좌명"]}</td>
                            <td className="px-2 py-2 border">{row["통장표시내용"]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">거래 내역이 없습니다.</div>
                )}
              </section>

              {/* 특성 요약 */}
              <section>
                <h2 className="text-lg font-semibold mb-2">특성 요약</h2>
                {result.features ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                      {[
                        ["총입금", result.features.sum_in?.toLocaleString?.() ?? result.features.sum_in],
                        ["총출금", result.features.sum_out?.toLocaleString?.() ?? result.features.sum_out],
                        ["패스스루비율", result.features.pass_through_ratio],
                        ["기간", `${result.features.start_ts} ~ ${result.features.end_ts}`],
                        ["거래건수(PAY)", result.features.pay_count],
                        ["PAY 최소/중앙값/최대", `${result.features.pay_min} / ${result.features.pay_median} / ${result.features.pay_max}`],
                        ["야간거래건수", result.features.night_pay_count],
                        ["개설→첫거래(시간)", result.features.first_tx_delta_hours ? `${Math.floor(result.features.first_tx_delta_hours)}시간 ${Math.floor((result.features.first_tx_delta_hours % 1) * 60)}분` : "N/A"],
                        ["개설→폐쇄(시간)", result.features.open_to_close_hours ? `${Math.floor(result.features.open_to_close_hours)}시간 ${Math.floor((result.features.open_to_close_hours % 1) * 60)}분` : "N/A"],
                        ["KPay 메모 존재", String(result.features.has_kppay_memo)],
                      ].map(([k, v]) => (
                        <div key={String(k)} className="flex justify-between gap-4 bg-gray-50 p-2 rounded">
                          <span className="text-gray-600">{String(k)}</span>
                          <span className="font-medium break-all">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    {result.features.beneficiaries && (
                    <div>
                      <h3 className="font-medium mb-1">수취인별 금액</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-2 border text-left">수취인</th>
                              <th className="px-2 py-2 border text-right">금액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(result.features.beneficiaries).map(([k, v]) => (
                              <tr key={k} className="odd:bg-white even:bg-gray-50">
                                <td className="px-2 py-2 border">{k}</td>
                                <td className="px-2 py-2 border text-right">{Number(v)?.toLocaleString?.() ?? String(v)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500">특성 요약 정보가 없습니다.</div>
                )}
              </section>

              {/* 탐지 결과 */}
              <section>
                <h2 className="text-lg font-semibold mb-2">탐지 결과</h2>
                {result.findings ? (
                  <>
                    {Array.isArray(result.findings.evidences) && result.findings.evidences.length > 0 ? (
                      <div className="space-y-3">
                      {result.findings.evidences.map((ev, i) => (
                        <div key={i} className="border rounded p-3">
                          <div className="flex justify-between items-center">
                            <div className="font-medium">{ev.detector}</div>
                            {typeof ev.severity === "number" && (
                              <div className="text-xs bg-gray-800 text-white px-2 py-1 rounded">severity {ev.severity}</div>
                            )}
                          </div>
                          <div className="text-sm text-gray-700 mt-1">{ev.summary}</div>
                          {ev.window && (
                            <div className="text-xs text-gray-500 mt-1">{ev.window.start} ~ {ev.window.end}</div>
                          )}
                          {ev.metrics && (
                            <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-x-auto">{JSON.stringify(ev.metrics, null, 2)}</pre>
                          )}
                        </div>
                      ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">탐지 증거가 없습니다.</div>
                    )}

                    {result.findings.scores && (
                      <div className="mt-3">
                        <h3 className="font-medium mb-1">스코어</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {Object.entries(result.findings.scores).map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-4 bg-gray-50 p-2 rounded">
                              <span className="text-gray-600">{k}</span>
                              <span className="font-medium">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500">탐지 결과가 없습니다.</div>
                )}
              </section>

              {/* 보고서 초안 */}
              <section>
                <h2 className="text-lg font-semibold mb-2">보고서 초안</h2>
                {result.draft ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                      <div className="flex justify-between gap-4 bg-gray-50 p-2 rounded">
                        <span className="text-gray-600">Risk Score</span>
                        <span className="font-medium">{Number(result.draft.risk_score).toFixed(3)}</span>
                      </div>
                      {Array.isArray(result.draft.laws) && (
                        <div className="bg-gray-50 p-2 rounded">
                          <div className="text-gray-600 mb-1">관련 법조항</div>
                          <ul className="list-disc pl-5">
                            {result.draft.laws.map((law, i) => (
                              <li key={i} className="text-sm">{law}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {Array.isArray(result.draft.sentences) && result.draft.sentences.length > 0 ? (
                      <div className="bg-white">
                        <div className="text-sm text-gray-700 mb-1">요약 문장</div>
                        <div className="space-y-2">
                          {result.draft.sentences.map((s, i) => (
                            <p key={i} className="text-sm whitespace-pre-wrap">{s}</p>
                          ))}
                        </div>
                      </div>
                    ) : (
                      result.draft.draft_text && (
                        <div>
                          <div className="text-sm text-gray-700 mb-1">요약</div>
                          <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded text-sm">{result.draft.draft_text}</pre>
                        </div>
                      )
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500">보고서 초안이 없습니다.</div>
                )}
              </section>

              {/* Route 정보 */}
              <section>
                <h2 className="text-lg font-semibold mb-2">라우팅 정보</h2>
                {result.draft?.route ? (
                  <div className="flex justify-between gap-4 bg-gray-50 p-2 rounded text-sm">
                    <span className="text-gray-600">Route</span>
                    <span className="font-medium">{result.draft.route}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">라우팅 정보가 없습니다.</div>
                )}
              </section>

              {/* 안전망: 원본 JSON */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 flex items-center justify-between">
                  <span>원본 JSON 보기</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                    }}
                    className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded border text-black"
                  >
                    복사
                  </button>
                </summary>
                <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-24 overflow-y-auto">{JSON.stringify(result, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>

        <footer className="mt-6 text-xs text-gray-500">
          <p>백엔드: FastAPI @ <code>GET /customers</code>, <code>POST /run</code> — 요청 바디: {"{ customer_name, llm_model, use_cache }"}</p>
        </footer>
      </div>
    </div>
  );
}
